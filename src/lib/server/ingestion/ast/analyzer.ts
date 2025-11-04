/**
 * AST Analysis & Symbol Extraction
 * Implements moderate-depth AST analysis to extract symbols from JavaScript/TypeScript source code.
 * Uses Babel parser and traverse for robust parsing of modern JS/TS syntax.
 */

import { parse, type ParseResult } from '@babel/parser';
import traverse, { type NodePath } from '@babel/traverse';
import type * as t from '@babel/types';
import { createHash } from 'node:crypto';
import type { ParsedSymbol } from '../types/index.js';

/**
 * Symbol with export information
 */
export interface SymbolWithExport extends ParsedSymbol {
  /** Export type if this symbol is exported */
  exportType?: 'named' | 'default' | 'namespace';
  /** Whether this is a re-export */
  isReExport?: boolean;
  /** Original name if exported with alias */
  exportedAs?: string;
}

/**
 * AST analysis result
 */
export interface AnalysisResult {
  /** Extracted symbols */
  symbols: SymbolWithExport[];
  /** AST hash for duplicate detection */
  astHash: string;
  /** Parse errors if any */
  errors: string[];
}

/**
 * Options for AST analysis
 */
export interface AnalyzerOptions {
  /** Source file type */
  sourceType?: 'module' | 'script' | 'unambiguous';
  /** Whether to include nested symbols */
  includeNested?: boolean;
  /** File path for better error messages */
  filePath?: string;
}

/**
 * Extract symbols from JavaScript/TypeScript code using AST analysis
 * @param code - Source code to analyze
 * @param options - Analysis options
 * @returns Analysis result with extracted symbols and metadata
 */
export function extractSymbols(code: string, options: AnalyzerOptions = {}): AnalysisResult {
  const {
    sourceType = 'module',
    includeNested = true,
    filePath = 'unknown',
  } = options;

  const symbols: SymbolWithExport[] = [];
  const errors: string[] = [];

  try {
    // Parse with TypeScript and JSX support
    const ast = parse(code, {
      sourceType,
      plugins: [
        'typescript',
        'jsx',
        'decorators',
        'classProperties',
        'classPrivateProperties',
        'classPrivateMethods',
        'exportDefaultFrom',
        'exportNamespaceFrom',
        'dynamicImport',
        'nullishCoalescingOperator',
        'optionalChaining',
        'topLevelAwait',
      ],
      errorRecovery: false, // Changed to capture errors properly
    });

    // Track exports for later association
    const exportMap = new Map<string, { type: 'named' | 'default' | 'namespace'; exportedAs?: string }>();

    // First pass: collect export information
    traverse(ast, {
      ExportNamedDeclaration(path) {
        if (path.node.declaration) {
          // export const x = 1; export function f() {}
          const declaration = path.node.declaration;
          if (declaration.type === 'VariableDeclaration') {
            declaration.declarations.forEach((decl) => {
              if (decl.id.type === 'Identifier') {
                exportMap.set(decl.id.name, { type: 'named' });
              }
            });
          } else if (
            declaration.type === 'FunctionDeclaration' ||
            declaration.type === 'ClassDeclaration'
          ) {
            if (declaration.id) {
              exportMap.set(declaration.id.name, { type: 'named' });
            }
          }
        } else if (path.node.specifiers) {
          // export { x, y as z }
          path.node.specifiers.forEach((spec) => {
            if (spec.type === 'ExportSpecifier') {
              exportMap.set(spec.local.name, {
                type: 'named',
                exportedAs: spec.exported.type === 'Identifier' ? spec.exported.name : undefined,
              });
            }
          });
        }
      },

      ExportDefaultDeclaration(path) {
        const declaration = path.node.declaration;
        if (
          (declaration.type === 'FunctionDeclaration' ||
            declaration.type === 'ClassDeclaration') &&
          declaration.id
        ) {
          exportMap.set(declaration.id.name, { type: 'default' });
        }
      },

      ExportAllDeclaration() {
        // export * from './module'
        // Namespace exports are tracked but don't add to symbol list directly
      },
    });

    // Second pass: extract symbols
    traverse(ast, {
      // Function declarations: function foo() {}
      FunctionDeclaration(path) {
        if (path.node.id && (!isNested(path) || includeNested)) {
          const scope = determineScope(path);
          const symbol = createFunctionSymbol(path.node, path, scope, exportMap);
          if (symbol) symbols.push(symbol);
        }
      },

      // Variable declarations: const x = 1, let y = 2, var z = 3
      VariableDeclaration(path) {
        // Only top-level or class-level variables
        if (!isNested(path) || includeNested) {
          path.node.declarations.forEach((declarator) => {
            if (declarator.id.type === 'Identifier') {
              const scope = determineScope(path);
              const symbol = createVariableSymbol(
                declarator,
                path.node.kind,
                path,
                scope,
                exportMap
              );
              if (symbol) symbols.push(symbol);
            }
          });
        }
      },

      // Class declarations: class Foo {}
      ClassDeclaration(path) {
        if (path.node.id) {
          const symbol = createClassSymbol(path.node, path, 'module', exportMap);
          if (symbol) symbols.push(symbol);

          // Extract class methods if includeNested
          if (includeNested) {
            const methods = extractClassMethods(path.node, path);
            symbols.push(...methods);
          }
        }
      },

      // Arrow functions and function expressions assigned to variables
      // are handled by VariableDeclaration visitor
    });

    // Generate AST hash
    const astHash = generateASTHash(ast);

    return {
      symbols,
      astHash,
      errors,
    };
  } catch (error) {
    errors.push(`Parse error in ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    return {
      symbols,
      astHash: '',
      errors,
    };
  }
}

/**
 * Determine if a path is nested (not at module level)
 */
function isNested(path: NodePath): boolean {
  let parent = path.parentPath;
  while (parent) {
    if (
      parent.isFunctionDeclaration() ||
      parent.isFunctionExpression() ||
      parent.isArrowFunctionExpression() ||
      parent.isClassMethod() ||
      parent.isObjectMethod()
    ) {
      return true;
    }
    parent = parent.parentPath;
  }
  return false;
}

/**
 * Determine the scope of a symbol
 */
function determineScope(path: NodePath): 'global' | 'module' | 'function' | 'block' {
  if (isNested(path)) {
    return 'function';
  }
  return 'module';
}

/**
 * Create a function symbol from AST node
 */
function createFunctionSymbol(
  node: t.FunctionDeclaration,
  path: NodePath,
  scope: 'global' | 'module' | 'function' | 'block',
  exportMap: Map<string, { type: 'named' | 'default' | 'namespace'; exportedAs?: string }>
): SymbolWithExport | null {
  if (!node.id || !node.loc) return null;

  const name = node.id.name;
  const exportInfo = exportMap.get(name);
  const size = estimateSize(node);

  return {
    name,
    type: 'function',
    location: {
      start: { line: node.loc.start.line, column: node.loc.start.column },
      end: { line: node.loc.end.line, column: node.loc.end.column },
    },
    size,
    scope,
    exportType: exportInfo?.type,
    exportedAs: exportInfo?.exportedAs,
  };
}

/**
 * Create a variable symbol from AST node
 */
function createVariableSymbol(
  node: t.VariableDeclarator,
  kind: 'const' | 'let' | 'var',
  path: NodePath,
  scope: 'global' | 'module' | 'function' | 'block',
  exportMap: Map<string, { type: 'named' | 'default' | 'namespace'; exportedAs?: string }>
): SymbolWithExport | null {
  if (node.id.type !== 'Identifier' || !node.loc) return null;

  const name = node.id.name;
  const exportInfo = exportMap.get(name);
  const size = estimateSize(node);

  // Determine if this is a function expression or arrow function
  let symbolType: ParsedSymbol['type'] = kind === 'const' ? 'const' : kind === 'let' ? 'let' : 'variable';
  
  if (
    node.init &&
    (node.init.type === 'FunctionExpression' || node.init.type === 'ArrowFunctionExpression')
  ) {
    symbolType = 'function';
  }

  return {
    name,
    type: symbolType,
    location: {
      start: { line: node.loc.start.line, column: node.loc.start.column },
      end: { line: node.loc.end.line, column: node.loc.end.column },
    },
    size,
    scope,
    exportType: exportInfo?.type,
    exportedAs: exportInfo?.exportedAs,
  };
}

/**
 * Create a class symbol from AST node
 */
function createClassSymbol(
  node: t.ClassDeclaration,
  _path: NodePath,
  scope: 'global' | 'module' | 'function' | 'block',
  exportMap: Map<string, { type: 'named' | 'default' | 'namespace'; exportedAs?: string }>
): SymbolWithExport | null {
  if (!node.id || !node.loc) return null;

  const name = node.id.name;
  const exportInfo = exportMap.get(name);
  const size = estimateSize(node);

  return {
    name,
    type: 'class',
    location: {
      start: { line: node.loc.start.line, column: node.loc.start.column },
      end: { line: node.loc.end.line, column: node.loc.end.column },
    },
    size,
    scope,
    exportType: exportInfo?.type,
    exportedAs: exportInfo?.exportedAs,
  };
}

/**
 * Extract methods from a class
 */
function extractClassMethods(
  node: t.ClassDeclaration,
  _path: NodePath
): SymbolWithExport[] {
  const methods: SymbolWithExport[] = [];

  node.body.body.forEach((member) => {
    if (
      (member.type === 'ClassMethod' || member.type === 'ClassPrivateMethod') &&
      member.kind === 'method' &&
      member.loc
    ) {
      const isPrivate = member.type === 'ClassPrivateMethod';
      const isStatic = 'static' in member && member.static;
      
      let name: string;
      if (isPrivate && member.key.type === 'PrivateName') {
        name = `#${member.key.id.name}`;
      } else if (member.key.type === 'Identifier') {
        name = member.key.name;
      } else {
        return; // Skip computed property names
      }

      // Add prefix to indicate method type
      const prefix = isStatic ? 'static ' : isPrivate ? 'private ' : '';
      const fullName = node.id ? `${node.id.name}.${prefix}${name}` : name;

      methods.push({
        name: fullName,
        type: 'function',
        location: {
          start: { line: member.loc.start.line, column: member.loc.start.column },
          end: { line: member.loc.end.line, column: member.loc.end.column },
        },
        size: estimateSize(member),
        scope: 'function',
      });
    }
  });

  return methods;
}

/**
 * Estimate the size of an AST node in bytes
 * Uses the source location to calculate approximate size
 */
function estimateSize(node: t.Node): number {
  if (!node.loc) return 0;
  
  const { start, end } = node.loc;
  const lines = end.line - start.line + 1;
  const cols = end.line === start.line ? end.column - start.column : end.column;
  
  // Rough estimate: average line is ~50 chars, plus specific column info
  return lines > 1 ? lines * 50 : cols;
}

/**
 * Generate a hash of the AST for duplicate detection
 * @param ast - Parsed AST
 * @returns Hash string
 */
function generateASTHash(ast: ParseResult<t.File>): string {
  // Create a simplified representation of the AST structure
  const astStructure = JSON.stringify(ast, (key, value) => {
    // Exclude location info and other metadata that doesn't affect structure
    if (key === 'loc' || key === 'start' || key === 'end' || key === 'extra' || key === 'comments') {
      return undefined;
    }
    return value;
  });

  return createHash('sha256').update(astStructure).digest('hex');
}

/**
 * Analyze function declarations and expressions
 * @param code - JavaScript code to analyze
 * @returns Array of function symbols
 */
export function analyzeFunctions(code: string): SymbolWithExport[] {
  const result = extractSymbols(code, { includeNested: false });
  return result.symbols.filter((s) => s.type === 'function');
}

/**
 * Analyze class declarations
 * @param code - JavaScript code to analyze
 * @returns Array of class symbols
 */
export function analyzeClasses(code: string): SymbolWithExport[] {
  const result = extractSymbols(code, { includeNested: true });
  return result.symbols.filter((s) => s.type === 'class');
}
