/**
 * Dependency analyzer rule
 * Detects problematic dependency patterns: circular dependencies, unused third-party dependencies, and overly deep dependency chains
 */

import type { SuggestionRule, SuggestionContext } from '../types.js';
import type { SuggestionData, DependencyRelationship } from '../../ingestion/db/writer.js';

export interface DependencyAnalyzerOptions {
  /** Maximum dependency depth before warning (default: 5) */
  maxDepth?: number;
  /** Whether to detect circular dependencies */
  detectCircular?: boolean;
  /** Whether to detect unused third-party dependencies */
  detectUnusedThirdParty?: boolean;
  /** Whether to detect deep dependency chains */
  detectDeepChains?: boolean;
}

const DEFAULT_OPTIONS: Required<DependencyAnalyzerOptions> = {
  maxDepth: 5,
  detectCircular: true,
  detectUnusedThirdParty: true,
  detectDeepChains: true,
};

/**
 * Creates a dependency analyzer rule
 * @param options - Configuration options
 */
export function createDependencyAnalyzer(options: DependencyAnalyzerOptions = {}): SuggestionRule {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return {
    id: 'dependency-analyzer',
    name: 'Dependency Analyzer',
    description:
      'Detects problematic dependency patterns: circular dependencies, unused third-party dependencies, and overly deep dependency chains',

    execute(context: SuggestionContext): SuggestionData[] {
      const suggestions: SuggestionData[] = [];

      // Build adjacency map for graph traversal
      const importMap = new Map<string, Set<string>>();
      for (const dep of context.dependencies) {
        if (!importMap.has(dep.importerPath)) {
          importMap.set(dep.importerPath, new Set());
        }
        importMap.get(dep.importerPath)!.add(dep.importedPath);
      }

      // Build reverse map (what imports this module)
      const reverseMap = new Map<string, Set<string>>();
      for (const dep of context.dependencies) {
        if (!reverseMap.has(dep.importedPath)) {
          reverseMap.set(dep.importedPath, new Set());
        }
        reverseMap.get(dep.importedPath)!.add(dep.importerPath);
      }

      // Build module map for quick lookup
      const moduleMap = new Map<string, (typeof context.modules)[0]>();
      for (const module of context.modules) {
        moduleMap.set(module.filePath, module);
      }

      // Detect circular dependencies
      if (opts.detectCircular) {
        const circularDeps = detectCircularDependencies(importMap);
        for (const cycle of circularDeps) {
          const cyclePaths = cycle.join(' → ');
          suggestions.push({
            type: 'circular-dependency',
            severity: 'warning',
            title: `Circular dependency detected: ${cycle[0]}`,
            description:
              `A circular dependency cycle was detected: ${cyclePaths} → ${cycle[0]}. ` +
              `Circular dependencies can cause initialization issues and make code harder to maintain. ` +
              `Consider refactoring to break the cycle by extracting shared code into a separate module.`,
            links: cycle.map((path) => ({
              entityType: 'Module' as const,
              entityPath: path,
            })),
          });
        }
      }

      // Detect unused third-party dependencies
      if (opts.detectUnusedThirdParty) {
        const unusedThirdParty = detectUnusedThirdPartyDependencies(
          context.modules,
          context.dependencies,
          reverseMap,
        );
        for (const unused of unusedThirdParty) {
          suggestions.push({
            type: 'unused-third-party',
            severity: 'info',
            title: `Unused third-party dependency: ${unused.packageName}`,
            description:
              `The package '${unused.packageName}' is imported but never used. ` +
              `Module '${unused.modulePath}' imports from this package, but no other modules depend on it. ` +
              `Consider removing this dependency to reduce bundle size.`,
            links: [
              {
                entityType: 'Module' as const,
                entityPath: unused.modulePath,
              },
            ],
          });
        }
      }

      // Detect deep dependency chains
      if (opts.detectDeepChains) {
        const deepChains = detectDeepDependencyChains(importMap, moduleMap, opts.maxDepth);
        for (const chain of deepChains) {
          const depth = chain.length - 1;
          const chainPath = chain.join(' → ');
          suggestions.push({
            type: 'deep-dependency-chain',
            severity: depth > 10 ? 'warning' : 'info',
            title: `Deep dependency chain detected (depth: ${depth})`,
            description:
              `Module '${chain[0]}' has a deep dependency chain with depth ${depth}: ${chainPath}. ` +
              `Deep dependency chains can impact build times and bundle size. ` +
              `Consider flattening the dependency structure or using lazy loading.`,
            links: chain.map((path) => ({
              entityType: 'Module' as const,
              entityPath: path,
            })),
          });
        }
      }

      return suggestions;
    },
  };
}

/**
 * Detect circular dependencies using DFS
 */
function detectCircularDependencies(importMap: Map<string, Set<string>>): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const path: string[] = [];

  function dfs(node: string): void {
    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    const imports = importMap.get(node) || new Set();
    for (const imported of imports) {
      if (!visited.has(imported)) {
        dfs(imported);
      } else if (recursionStack.has(imported)) {
        // Found a cycle
        const cycleStart = path.indexOf(imported);
        if (cycleStart >= 0) {
          // Extract the cycle: from the cycle start to the current node
          // The cycle is: path[cycleStart] ... path[path.length-1] -> imported (which is path[cycleStart])
          const cycle = path.slice(cycleStart);
          // Only add if not already detected (check by normalized cycle)
          const normalizedCycle = normalizeCycle(cycle);
          if (!cycles.some((c) => areCyclesEqual(normalizedCycle, normalizeCycle(c)))) {
            cycles.push(normalizedCycle);
          }
        }
      }
    }

    path.pop();
    recursionStack.delete(node);
  }

  for (const node of importMap.keys()) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }

  return cycles;
}

/**
 * Normalize a cycle to start from the lexicographically smallest node
 */
function normalizeCycle(cycle: string[]): string[] {
  if (cycle.length === 0) return cycle;
  const minIndex = cycle.reduce((minIdx, node, idx) => (node < cycle[minIdx] ? idx : minIdx), 0);
  return cycle.slice(minIndex).concat(cycle.slice(0, minIndex));
}

/**
 * Check if two cycles are equal (considering rotation)
 */
function areCyclesEqual(cycle1: string[], cycle2: string[]): boolean {
  if (cycle1.length !== cycle2.length) return false;
  if (cycle1.length === 0) return true;

  // Check if cycle2 is a rotation of cycle1
  for (let offset = 0; offset < cycle1.length; offset++) {
    let matches = true;
    for (let i = 0; i < cycle1.length; i++) {
      if (cycle1[i] !== cycle2[(i + offset) % cycle2.length]) {
        matches = false;
        break;
      }
    }
    if (matches) return true;
  }
  return false;
}

/**
 * Detect unused third-party dependencies
 * A third-party dependency is unused if:
 * 1. It's a third-party module
 * 2. No other modules import from it (only in reverseMap, not imported by others)
 */
function detectUnusedThirdPartyDependencies(
  modules: (typeof import('../../ingestion/db/writer.js').ModuleWithAnalysis)[],
  dependencies: DependencyRelationship[],
  reverseMap: Map<string, Set<string>>,
): Array<{ packageName: string; modulePath: string }> {
  const unused: Array<{ packageName: string; modulePath: string }> = [];

  // Find all third-party modules
  const thirdPartyModules = modules.filter((m) => m.isThirdParty && m.packageName);

  for (const module of thirdPartyModules) {
    // Check if this module is imported by any other module
    const importers = reverseMap.get(module.filePath) || new Set();

    // If no one imports it, it's unused
    if (importers.size === 0) {
      unused.push({
        packageName: module.packageName!,
        modulePath: module.filePath,
      });
    }
  }

  return unused;
}

/**
 * Detect deep dependency chains
 * Returns chains that exceed the max depth
 */
function detectDeepDependencyChains(
  importMap: Map<string, Set<string>>,
  moduleMap: Map<string, (typeof import('../../ingestion/db/writer.js').ModuleWithAnalysis)[0]>,
  maxDepth: number,
): string[][] {
  const deepChains: string[][] = [];

  // Only check modules that actually have dependencies
  const modulesWithDeps = Array.from(moduleMap.keys()).filter(
    (path) => (importMap.get(path)?.size || 0) > 0,
  );

  // For each module, find the longest path from it
  for (const startModule of modulesWithDeps) {
    const longestPath = findLongestPath(startModule, importMap, new Set<string>());
    const depth = longestPath.length - 1;
    if (depth > maxDepth) {
      deepChains.push(longestPath);
    }
  }

  // Remove duplicates and sub-chains
  return deduplicateChains(deepChains);
}

/**
 * Find the longest dependency path from a starting module using DFS
 */
function findLongestPath(
  start: string,
  importMap: Map<string, Set<string>>,
  visited: Set<string>,
): string[] {
  if (visited.has(start)) {
    return [start]; // Cycle detected, return just this node
  }

  visited.add(start);
  const imports = importMap.get(start) || new Set();
  let longestPath: string[] = [start];
  let maxLength = 1;

  for (const imported of imports) {
    const subPath = findLongestPath(imported, importMap, new Set(visited));
    if (subPath.length + 1 > maxLength) {
      maxLength = subPath.length + 1;
      longestPath = [start, ...subPath];
    }
  }

  return longestPath;
}

/**
 * Remove duplicate chains and sub-chains
 */
function deduplicateChains(chains: string[][]): string[][] {
  const unique: string[][] = [];

  for (const chain of chains) {
    // Check if this chain is a sub-chain of an existing one
    let isSubChain = false;
    for (const existing of unique) {
      if (isSubChainOf(chain, existing)) {
        isSubChain = true;
        break;
      }
      // If existing is a sub-chain of this, replace it
      if (isSubChainOf(existing, chain)) {
        const index = unique.indexOf(existing);
        unique[index] = chain;
        isSubChain = true;
        break;
      }
    }

    if (!isSubChain) {
      unique.push(chain);
    }
  }

  return unique;
}

/**
 * Check if chain1 is a sub-chain of chain2 (contiguous sequence)
 */
function isSubChainOf(chain1: string[], chain2: string[]): boolean {
  if (chain1.length > chain2.length) return false;
  if (chain1.length === 0) return true;

  // Check if chain1 appears as a contiguous subsequence in chain2
  for (let i = 0; i <= chain2.length - chain1.length; i++) {
    let matches = true;
    for (let j = 0; j < chain1.length; j++) {
      if (chain1[j] !== chain2[i + j]) {
        matches = false;
        break;
      }
    }
    if (matches) return true;
  }
  return false;
}
