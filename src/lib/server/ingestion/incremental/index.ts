/**
 * Incremental analysis module
 * Handles diff and comparison logic for bundle changes
 */

// Re-export all differ functionality
export {
  loadPreviousRun,
  computeModuleDiff,
  computeSymbolDiff,
  computeIncrementalDiff,
  shouldReanalyze,
  type PreviousModule,
  type PreviousSymbol,
  type ModuleDiff,
  type SymbolDiff,
  type IncrementalDiff,
} from './differ.js';
