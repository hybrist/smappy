/**
 * Type definitions for query API
 */

import type { analysisRun, module, symbol, dependency } from '../db/schema';

// Pagination options
export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

// Module filtering and sorting options
export interface ModulesFilterOptions extends PaginationOptions {
  fileType?: string;
  isThirdParty?: boolean;
  minSize?: number;
  maxSize?: number;
  sortBy?: 'filePath' | 'bundledSize' | 'originalSize';
  sortOrder?: 'asc' | 'desc';
}

// Symbol filtering and sorting options
export interface SymbolsFilterOptions extends PaginationOptions {
  type?: 'function' | 'class' | 'variable';
  isExported?: boolean;
  minSize?: number;
  maxSize?: number;
  sortBy?: 'name' | 'computedBundledSize' | 'computedGzipSize';
  sortOrder?: 'asc' | 'desc';
}

// Analysis run with metadata
export type AnalysisRun = typeof analysisRun.$inferSelect;

// Module with aggregated data
export type Module = typeof module.$inferSelect;

// Symbol with location data
export type Symbol = typeof symbol.$inferSelect;

// Dependency with module information
export type Dependency = typeof dependency.$inferSelect;

// Analysis summary with aggregate statistics
export interface AnalysisSummary extends AnalysisRun {
  totalModules: number;
  totalSize: number;
  totalGzipSize: number;
  thirdPartyModules: number;
  thirdPartySize: number;
  chunksCount: number;
  bundlesCount: number;
}

// Module with related data
export interface ModuleDetail extends Module {
  symbols: Symbol[];
  dependencies: Dependency[];
  dependents: Dependency[];
  chunks: Array<{
    id: number;
    name: string | null;
  }>;
}

// Comparison result
export interface AnalysisComparison {
  before: AnalysisSummary;
  after: AnalysisSummary;
  diff: {
    totalSizeDiff: number;
    totalGzipSizeDiff: number;
    modulesDiff: number;
    addedModules: Module[];
    removedModules: Module[];
    changedModules: Array<{
      module: Module;
      beforeSize: number;
      afterSize: number;
      sizeDiff: number;
    }>;
  };
}

// Dependency graph node
export interface DependencyGraphNode {
  id: number;
  filePath: string;
  bundledSize: number;
  isThirdParty: boolean;
  packageName: string | null;
}

// Dependency graph edge
export interface DependencyGraphEdge {
  from: number; // moduleId
  to: number; // moduleId
  importType: string;
  importedSymbols: string[] | null;
}

// Complete dependency graph
export interface DependencyGraph {
  nodes: DependencyGraphNode[];
  edges: DependencyGraphEdge[];
}

// Paginated result
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}
