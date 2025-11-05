/**
 * Incremental analysis differ
 * Detects changes between analysis runs for performance optimization
 */

import { db } from '../../db/index.js';
import * as schema from '../../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { createHash } from 'crypto';
import type { ModuleInput } from '../types/index.js';
import type { SymbolWithExport } from '../ast/analyzer.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Previous module data from database
 */
export interface PreviousModule {
  filePath: string;
  originalSize: number;
  bundledSize: number;
  contentHash: string;
  symbols: PreviousSymbol[];
}

/**
 * Previous symbol data from database
 */
export interface PreviousSymbol {
  name: string;
  type: string;
  astHash: string;
  isExported: boolean;
}

/**
 * Module-level diff result
 */
export interface ModuleDiff {
  /** Modules that exist in current but not previous */
  added: string[];
  /** Modules that exist in previous but not current */
  removed: string[];
  /** Modules that exist in both but have changed */
  modified: string[];
  /** Modules that exist in both and are unchanged */
  unchanged: string[];
}

/**
 * Symbol-level diff for a single module
 */
export interface SymbolDiff {
  /** Module file path */
  filePath: string;
  /** Symbols added in current version */
  added: string[];
  /** Symbols removed from previous version */
  removed: string[];
  /** Symbols that changed (different AST hash) */
  modified: string[];
  /** Symbols that are unchanged */
  unchanged: string[];
}

/**
 * Complete diff result
 */
export interface IncrementalDiff {
  /** Module-level changes */
  moduleDiff: ModuleDiff;
  /** Symbol-level changes per module */
  symbolDiffs: Map<string, SymbolDiff>;
  /** Whether incremental analysis is possible */
  canUseIncremental: boolean;
  /** Previous analysis run ID (if exists) */
  previousRunId: number | null;
}

// ============================================================================
// Main API
// ============================================================================

/**
 * Load previous analysis run data from database
 *
 * @param projectName - Project name to look up
 * @returns Previous run data or null if not found
 */
export async function loadPreviousRun(
  projectName: string,
): Promise<{ runId: number; modules: Map<string, PreviousModule> } | null> {
  const { desc } = await import('drizzle-orm');

  // Get most recent analysis run
  // Order by ID as secondary sort in case timestamps are identical
  const runs = await db
    .select({ id: schema.analysisRun.id })
    .from(schema.analysisRun)
    .where(eq(schema.analysisRun.projectName, projectName))
    .orderBy(desc(schema.analysisRun.createdAt), desc(schema.analysisRun.id))
    .limit(1);

  if (runs.length === 0) {
    return null;
  }

  const runId = runs[0].id;

  // Load all modules from previous run
  const modules = await db
    .select({
      filePath: schema.module.filePath,
      originalSize: schema.module.originalSize,
      bundledSize: schema.module.bundledSize,
      moduleId: schema.module.id,
    })
    .from(schema.module)
    .where(eq(schema.module.analysisRunId, runId));

  // Load symbols for each module
  const moduleMap = new Map<string, PreviousModule>();

  for (const mod of modules) {
    const symbols = await db
      .select({
        name: schema.symbol.name,
        type: schema.symbol.type,
        astHash: schema.symbol.astHash,
        isExported: schema.symbol.isExported,
      })
      .from(schema.symbol)
      .where(eq(schema.symbol.moduleId, mod.moduleId));

    // Compute content hash from module metadata
    const contentHash = computeModuleContentHash({
      originalSize: mod.originalSize,
      symbolHashes: symbols.map((s) => s.astHash || '').filter(Boolean),
    });

    moduleMap.set(mod.filePath, {
      filePath: mod.filePath,
      originalSize: mod.originalSize,
      bundledSize: mod.bundledSize,
      contentHash,
      symbols: symbols.map((s) => ({
        name: s.name,
        type: s.type,
        astHash: s.astHash || '',
        isExported: Boolean(s.isExported),
      })),
    });
  }

  return { runId, modules: moduleMap };
}

/**
 * Compute module-level diff between previous and current runs
 *
 * @param previous - Previous modules (may be null on first run)
 * @param current - Current modules
 * @returns Module diff
 */
export function computeModuleDiff(
  previous: Map<string, PreviousModule> | null,
  current: ModuleInput[],
): ModuleDiff {
  const diff: ModuleDiff = {
    added: [],
    removed: [],
    modified: [],
    unchanged: [],
  };

  if (!previous) {
    // First run - everything is added
    diff.added = current.map((m) => m.filePath);
    return diff;
  }

  const currentPaths = new Set(current.map((m) => m.filePath));
  const previousPaths = new Set(previous.keys());

  // Find added modules
  for (const currentModule of current) {
    if (!previousPaths.has(currentModule.filePath)) {
      diff.added.push(currentModule.filePath);
    }
  }

  // Find removed modules
  for (const prevPath of previousPaths) {
    if (!currentPaths.has(prevPath)) {
      diff.removed.push(prevPath);
    }
  }

  // Find modified/unchanged modules
  for (const currentModule of current) {
    const prevModule = previous.get(currentModule.filePath);
    if (!prevModule) {
      continue; // Already counted as added
    }

    // Quick check: size change
    if (prevModule.originalSize !== computeRawSize(currentModule.sourceContent)) {
      diff.modified.push(currentModule.filePath);
      continue;
    }

    // Content hash comparison (more expensive but accurate)
    const currentHash = computeModuleContentHash({
      originalSize: computeRawSize(currentModule.sourceContent),
      symbolHashes: [], // Will be populated after AST analysis
    });

    if (prevModule.contentHash !== currentHash) {
      diff.modified.push(currentModule.filePath);
    } else {
      diff.unchanged.push(currentModule.filePath);
    }
  }

  return diff;
}

/**
 * Compute symbol-level diff for a specific module
 *
 * @param filePath - Module file path
 * @param previousSymbols - Symbols from previous run
 * @param currentSymbols - Symbols from current run
 * @returns Symbol diff
 */
export function computeSymbolDiff(
  filePath: string,
  previousSymbols: PreviousSymbol[],
  currentSymbols: SymbolWithExport[],
): SymbolDiff {
  const diff: SymbolDiff = {
    filePath,
    added: [],
    removed: [],
    modified: [],
    unchanged: [],
  };

  const currentSymbolMap = new Map(currentSymbols.map((s) => [s.name, s]));
  const previousSymbolMap = new Map(previousSymbols.map((s) => [s.name, s]));

  // Find added symbols
  for (const [name, currentSymbol] of currentSymbolMap) {
    if (!previousSymbolMap.has(name)) {
      diff.added.push(name);
    }
  }

  // Find removed symbols
  for (const [name] of previousSymbolMap) {
    if (!currentSymbolMap.has(name)) {
      diff.removed.push(name);
    }
  }

  // Find modified/unchanged symbols
  for (const [name, currentSymbol] of currentSymbolMap) {
    const prevSymbol = previousSymbolMap.get(name);
    if (!prevSymbol) {
      continue; // Already counted as added
    }

    // Compute AST hash for current symbol
    const currentHash = computeSymbolAstHash(currentSymbol);

    if (prevSymbol.astHash !== currentHash) {
      diff.modified.push(name);
    } else {
      diff.unchanged.push(name);
    }
  }

  return diff;
}

/**
 * Perform complete incremental diff analysis
 *
 * @param projectName - Project name
 * @param currentModules - Current modules to analyze
 * @param currentSymbols - Map of file path to extracted symbols
 * @returns Complete incremental diff
 */
export async function computeIncrementalDiff(
  projectName: string,
  currentModules: ModuleInput[],
  currentSymbols: Map<string, SymbolWithExport[]>,
): Promise<IncrementalDiff> {
  const previousRun = await loadPreviousRun(projectName);

  const diff: IncrementalDiff = {
    moduleDiff: computeModuleDiff(previousRun?.modules ?? null, currentModules),
    symbolDiffs: new Map(),
    canUseIncremental: previousRun !== null,
    previousRunId: previousRun?.runId ?? null,
  };

  // Compute symbol-level diffs for modules that exist in both runs
  if (previousRun) {
    for (const currentModule of currentModules) {
      const prevModule = previousRun.modules.get(currentModule.filePath);
      const currSymbols = currentSymbols.get(currentModule.filePath);

      if (prevModule && currSymbols) {
        const symbolDiff = computeSymbolDiff(
          currentModule.filePath,
          prevModule.symbols,
          currSymbols,
        );
        diff.symbolDiffs.set(currentModule.filePath, symbolDiff);
      }
    }
  }

  return diff;
}

/**
 * Determine whether a module should be re-analyzed
 *
 * @param modulePath - Module file path
 * @param diff - Incremental diff result
 * @returns true if module needs re-analysis
 */
export function shouldReanalyze(modulePath: string, diff: IncrementalDiff): boolean {
  // Always analyze if no previous run
  if (!diff.canUseIncremental) {
    return true;
  }

  // Analyze if module was added or modified
  if (
    diff.moduleDiff.added.includes(modulePath) ||
    diff.moduleDiff.modified.includes(modulePath)
  ) {
    return true;
  }

  // Analyze if any symbols changed
  const symbolDiff = diff.symbolDiffs.get(modulePath);
  if (
    symbolDiff &&
    (symbolDiff.added.length > 0 ||
      symbolDiff.removed.length > 0 ||
      symbolDiff.modified.length > 0)
  ) {
    return true;
  }

  // Otherwise, skip analysis
  return false;
}

// ============================================================================
// Hash Utilities
// ============================================================================

/**
 * Compute content hash for a module based on size and symbol hashes
 */
function computeModuleContentHash(data: {
  originalSize: number;
  symbolHashes: string[];
}): string {
  const content = JSON.stringify({
    size: data.originalSize,
    symbols: data.symbolHashes.sort(),
  });

  return createHash('sha256').update(content).digest('hex');
}

/**
 * Compute AST hash for a symbol
 */
function computeSymbolAstHash(symbol: SymbolWithExport): string {
  const content = JSON.stringify({
    name: symbol.name,
    type: symbol.type,
    location: symbol.location,
    scope: symbol.scope,
    exportType: symbol.exportType,
  });

  return createHash('sha256').update(content).digest('hex');
}

/**
 * Compute raw size of content
 */
function computeRawSize(content: string): number {
  return Buffer.byteLength(content, 'utf8');
}
