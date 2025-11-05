/**
 * Dependency graph builder
 * Builds import/export dependency graphs from source code
 */

import { parse } from '@babel/parser';
import traverse, { type NodePath } from '@babel/traverse';
import type {
  ImportDeclaration,
  ExportNamedDeclaration,
  ExportAllDeclaration,
  CallExpression,
  StringLiteral,
} from '@babel/types';
import type { ParsedDependency } from '../types/index.js';
import { resolve, dirname, isAbsolute } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

// ============================================================================
// Types
// ============================================================================

/**
 * Options for building the dependency graph
 */
export interface BuilderOptions {
  /** Base directory for resolving relative paths */
  baseDir: string;
  /** Path aliases (e.g., { '@': './src' }) */
  aliases?: Record<string, string>;
  /** Paths to package.json files for resolving node_modules */
  packageJsonPaths?: string[];
  /** Whether to follow dynamic imports */
  followDynamicImports?: boolean;
}

/**
 * Resolved module information
 */
export interface ResolvedModule {
  /** Original import path */
  originalPath: string;
  /** Resolved absolute or relative path */
  resolvedPath: string;
  /** Whether this is a third-party module */
  isThirdParty: boolean;
  /** Package name if third-party */
  packageName?: string;
  /** Package version if available */
  packageVersion?: string;
}

/**
 * Dependency graph result
 */
export interface DependencyGraph {
  /** All parsed dependencies */
  dependencies: ParsedDependency[];
  /** Resolved module information */
  modules: Map<string, ResolvedModule>;
  /** Circular dependency chains (if any) */
  circularDependencies: string[][];
}

// ============================================================================
// Main API
// ============================================================================

/**
 * Build dependency graph from source code
 * @param sourceCode - Source code to analyze
 * @param filePath - Path of the file being analyzed
 * @param options - Builder options
 * @returns Dependency graph
 */
export function buildDependencyGraph(
  sourceCode: string,
  filePath: string,
  options: BuilderOptions,
): DependencyGraph {
  const dependencies: ParsedDependency[] = [];
  const modules = new Map<string, ResolvedModule>();

  // Parse the source code
  let ast;
  try {
    ast = parse(sourceCode, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx', 'decorators'],
      errorRecovery: true,
    });
  } catch {
    // If parsing fails, return empty graph
    return {
      dependencies: [],
      modules: new Map(),
      circularDependencies: [],
    };
  }

  // Traverse AST and extract dependencies
  traverse(ast, {
    ImportDeclaration(path: NodePath<ImportDeclaration>) {
      const dep = parseImportDeclaration(path.node, filePath);
      if (dep) {
        dependencies.push(dep);
        resolveAndCacheModule(dep.target, filePath, options, modules);
      }
    },

    ExportNamedDeclaration(path: NodePath<ExportNamedDeclaration>) {
      const dep = parseExportNamedDeclaration(path.node, filePath);
      if (dep) {
        dependencies.push(dep);
        resolveAndCacheModule(dep.target, filePath, options, modules);
      }
    },

    ExportAllDeclaration(path: NodePath<ExportAllDeclaration>) {
      const dep = parseExportAllDeclaration(path.node, filePath);
      if (dep) {
        dependencies.push(dep);
        resolveAndCacheModule(dep.target, filePath, options, modules);
      }
    },

    CallExpression(path: NodePath<CallExpression>) {
      if (options.followDynamicImports !== false) {
        const dep = parseDynamicImport(path.node, filePath);
        if (dep) {
          dependencies.push(dep);
          resolveAndCacheModule(dep.target, filePath, options, modules);
        }
      }
    },
  });

  // Detect circular dependencies
  const circularDependencies = findCircularDependencies(dependencies);

  return {
    dependencies,
    modules,
    circularDependencies,
  };
}

// ============================================================================
// Import/Export Parsing
// ============================================================================

/**
 * Parse an import declaration
 */
function parseImportDeclaration(node: ImportDeclaration, filePath: string): ParsedDependency {
  const importedNames: string[] = [];
  let isDefault = false;
  let isNamespace = false;

  for (const specifier of node.specifiers) {
    if (specifier.type === 'ImportDefaultSpecifier') {
      isDefault = true;
      importedNames.push('default');
    } else if (specifier.type === 'ImportNamespaceSpecifier') {
      isNamespace = true;
      importedNames.push('*');
    } else if (specifier.type === 'ImportSpecifier') {
      const imported =
        specifier.imported.type === 'Identifier'
          ? specifier.imported.name
          : specifier.imported.value;
      importedNames.push(imported);
    }
  }

  return {
    source: filePath,
    target: node.source.value,
    type: 'import',
    importedNames: importedNames.length > 0 ? importedNames : undefined,
    isDefault,
    isNamespace,
    location: node.loc
      ? {
          start: { line: node.loc.start.line, column: node.loc.start.column },
          end: { line: node.loc.end.line, column: node.loc.end.column },
        }
      : undefined,
  };
}

/**
 * Parse an export named declaration
 */
function parseExportNamedDeclaration(
  node: ExportNamedDeclaration,
  filePath: string,
): ParsedDependency | null {
  if (!node.source) {
    return null; // No re-export
  }

  const importedNames: string[] = [];

  for (const specifier of node.specifiers) {
    if (specifier.type === 'ExportSpecifier') {
      const exported =
        specifier.exported.type === 'Identifier'
          ? specifier.exported.name
          : specifier.exported.value;
      importedNames.push(exported);
    }
  }

  return {
    source: filePath,
    target: node.source.value,
    type: 're-export',
    importedNames: importedNames.length > 0 ? importedNames : undefined,
    location: node.loc
      ? {
          start: { line: node.loc.start.line, column: node.loc.start.column },
          end: { line: node.loc.end.line, column: node.loc.end.column },
        }
      : undefined,
  };
}

/**
 * Parse an export all declaration
 */
function parseExportAllDeclaration(node: ExportAllDeclaration, filePath: string): ParsedDependency {
  return {
    source: filePath,
    target: node.source.value,
    type: 're-export',
    isNamespace: true,
    location: node.loc
      ? {
          start: { line: node.loc.start.line, column: node.loc.start.column },
          end: { line: node.loc.end.line, column: node.loc.end.column },
        }
      : undefined,
  };
}

/**
 * Parse a dynamic import (import())
 */
function parseDynamicImport(node: CallExpression, filePath: string): ParsedDependency | null {
  // Check if this is import()
  if (node.callee.type !== 'Import') {
    return null;
  }

  // Extract the module path (only support string literals for now)
  const arg = node.arguments[0];
  if (!arg || arg.type !== 'StringLiteral') {
    return null;
  }

  return {
    source: filePath,
    target: (arg as StringLiteral).value,
    type: 'dynamic-import',
    location: node.loc
      ? {
          start: { line: node.loc.start.line, column: node.loc.start.column },
          end: { line: node.loc.end.line, column: node.loc.end.column },
        }
      : undefined,
  };
}

// ============================================================================
// Module Resolution
// ============================================================================

/**
 * Resolve a module path and cache the result
 */
function resolveAndCacheModule(
  importPath: string,
  fromFile: string,
  options: BuilderOptions,
  cache: Map<string, ResolvedModule>,
): void {
  // Use cache key that includes both the import path and the file it's imported from
  const cacheKey = `${fromFile}:${importPath}`;

  if (!cache.has(cacheKey)) {
    const resolved = resolveModule(importPath, fromFile, options);
    cache.set(cacheKey, resolved);
  }
}

/**
 * Resolve a module path to its absolute path
 */
export function resolveModule(
  importPath: string,
  fromFile: string,
  options: BuilderOptions,
): ResolvedModule {
  // Check if it's an aliased path first (before third-party check)
  // This is important because some aliases like '@/*' can look like scoped packages
  if (options.aliases) {
    for (const [alias, aliasPath] of Object.entries(options.aliases)) {
      if (importPath.startsWith(alias)) {
        const resolvedAlias = resolve(
          options.baseDir,
          aliasPath,
          importPath.slice(alias.length + 1),
        );
        return {
          originalPath: importPath,
          resolvedPath: resolvedAlias,
          isThirdParty: false,
        };
      }
    }
  }

  // Check if it's a third-party module (doesn't start with . or /)
  const isThirdParty = !importPath.startsWith('.') && !importPath.startsWith('/');

  if (isThirdParty) {
    return resolveThirdPartyModule(importPath, options);
  }

  // Resolve relative path
  const fromDir = dirname(fromFile);
  const resolvedPath = isAbsolute(importPath) ? importPath : resolve(fromDir, importPath);

  return {
    originalPath: importPath,
    resolvedPath,
    isThirdParty: false,
  };
}

/**
 * Resolve a third-party module
 */
function resolveThirdPartyModule(importPath: string, options: BuilderOptions): ResolvedModule {
  // Extract package name (handle scoped packages)
  let packageName: string;
  if (importPath.startsWith('@')) {
    // Scoped package: @scope/package
    const parts = importPath.split('/');
    packageName = parts.slice(0, 2).join('/');
  } else {
    // Regular package: package or package/subpath
    packageName = importPath.split('/')[0];
  }

  // Try to find package.json and extract version
  let packageVersion: string | undefined;

  if (options.packageJsonPaths) {
    for (const pkgPath of options.packageJsonPaths) {
      try {
        if (existsSync(pkgPath)) {
          const pkgJson = JSON.parse(readFileSync(pkgPath, 'utf-8'));
          packageVersion =
            pkgJson.dependencies?.[packageName] ||
            pkgJson.devDependencies?.[packageName] ||
            pkgJson.peerDependencies?.[packageName];

          if (packageVersion) {
            // Clean up version string (remove ^, ~, etc.)
            packageVersion = packageVersion.replace(/^[\^~]/, '');
            break;
          }
        }
      } catch {
        // Ignore errors reading package.json
      }
    }
  }

  return {
    originalPath: importPath,
    resolvedPath: importPath,
    isThirdParty: true,
    packageName,
    packageVersion,
  };
}

// ============================================================================
// Circular Dependency Detection
// ============================================================================

/**
 * Find circular dependencies in the dependency graph
 */
export function findCircularDependencies(dependencies: ParsedDependency[]): string[][] {
  // Build adjacency list
  const graph = new Map<string, Set<string>>();

  for (const dep of dependencies) {
    if (!graph.has(dep.source)) {
      graph.set(dep.source, new Set());
    }
    graph.get(dep.source)!.add(dep.target);
  }

  // Find cycles using DFS
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const currentPath: string[] = [];

  function dfs(node: string): void {
    visited.add(node);
    recursionStack.add(node);
    currentPath.push(node);

    const neighbors = graph.get(node);
    if (neighbors) {
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor);
        } else if (recursionStack.has(neighbor)) {
          // Found a cycle
          const cycleStartIndex = currentPath.indexOf(neighbor);
          if (cycleStartIndex !== -1) {
            const cycle = currentPath.slice(cycleStartIndex);
            cycle.push(neighbor); // Close the cycle
            cycles.push(cycle);
          }
        }
      }
    }

    currentPath.pop();
    recursionStack.delete(node);
  }

  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }

  return cycles;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a module is a third-party dependency
 */
export function isThirdPartyModule(importPath: string): boolean {
  return !importPath.startsWith('.') && !importPath.startsWith('/');
}

/**
 * Extract package name from an import path
 */
export function extractPackageName(importPath: string): string | null {
  if (!isThirdPartyModule(importPath)) {
    return null;
  }

  if (importPath.startsWith('@')) {
    // Scoped package
    const parts = importPath.split('/');
    return parts.slice(0, 2).join('/');
  }

  // Regular package
  return importPath.split('/')[0];
}

/**
 * Get package metadata from package.json
 */
export function getPackageMetadata(
  packageName: string,
  packageJsonPaths: string[],
): { version?: string; resolved?: boolean } {
  for (const pkgPath of packageJsonPaths) {
    try {
      if (existsSync(pkgPath)) {
        const pkgJson = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        const version =
          pkgJson.dependencies?.[packageName] ||
          pkgJson.devDependencies?.[packageName] ||
          pkgJson.peerDependencies?.[packageName];

        if (version) {
          return {
            version: version.replace(/^[\^~]/, ''),
            resolved: true,
          };
        }
      }
    } catch {
      // Ignore errors
    }
  }

  return { resolved: false };
}
