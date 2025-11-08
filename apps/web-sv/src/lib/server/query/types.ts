/**
 * Types for query functions
 * Type-safe definitions for query parameters and return values
 */

/**
 * Analysis run with full details
 */
export interface AnalysisRun {
  id: number;
  projectName: string | null;
  createdAt: string;
  bundler: string | null;
  moduleCount?: number;
  bundleCount?: number;
  totalSize?: number;
  totalGzipSize?: number;
}

/**
 * Module query result
 */
export interface Module {
  id: number;
  analysisRunId: number;
  filePath: string;
  fileType: string;
  originalSize: number;
  bundledSize: number;
  isThirdParty: boolean;
  packageName: string | null;
  packageVersion: string | null;
  exports: string[] | null;
  usedExports: string[] | null;
}

/**
 * Symbol query result
 */
export interface Symbol {
  id: number;
  moduleId: number;
  name: string;
  type: string;
  sourceStartLine: number;
  sourceStartCol: number;
  sourceEndLine: number;
  sourceEndCol: number;
  astHash: string | null;
  isExported: boolean;
  computedBundledSize: number;
  computedGzipSize: number;
}

/**
 * Dependency query result
 */
export interface Dependency {
  id: number;
  analysisRunId: number;
  importerModuleId: number;
  importedModuleId: number;
  importType: 'static' | 'dynamic';
  importedSymbols: string[] | null;
  importerPath: string;
  importedPath: string;
}

/**
 * Dependency graph node
 */
export interface DependencyNode {
  moduleId: number;
  filePath: string;
  dependencies: DependencyEdge[];
  dependents: DependencyEdge[];
}

/**
 * Dependency graph edge
 */
export interface DependencyEdge {
  targetModuleId: number;
  targetPath: string;
  importType: 'static' | 'dynamic';
  importedSymbols: string[] | null;
}

/**
 * Comparison result between two analyses
 */
export interface AnalysisComparison {
  run1: AnalysisRun;
  run2: AnalysisRun;
  moduleDiff: {
    added: Module[];
    removed: Module[];
    modified: {
      module: Module;
      sizeDelta: number;
      exportsChanged: boolean;
    }[];
    unchanged: Module[];
  };
  sizeDelta: {
    totalSize: number;
    totalGzipSize: number;
  };
  bundleDiff: {
    added: number;
    removed: number;
    modified: number;
  };
}

/**
 * Options for querying modules
 */
export interface ModuleQueryOptions {
  /** Filter by file type */
  fileType?: string;
  /** Filter by third-party status */
  isThirdParty?: boolean;
  /** Filter by package name */
  packageName?: string;
  /** Search in file path */
  search?: string;
  /** Sort field */
  sortBy?: 'filePath' | 'originalSize' | 'bundledSize';
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
  /** Page number (1-indexed) */
  page?: number;
  /** Page size */
  pageSize?: number;
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Analysis summary with aggregate statistics
 */
export interface AnalysisSummary extends AnalysisRun {
  totalModules: number;
  totalSize: number;
  totalGzipSize: number;
  thirdPartyModules: number;
  thirdPartySize: number;
  chunksCount: number;
  bundlesCount: number;
}

/**
 * Dependency graph node for graph visualization
 */
export interface DependencyGraphNode {
  id: number;
  filePath: string;
  bundledSize: number;
  isThirdParty: boolean;
  packageName: string | null;
}

/**
 * Dependency graph edge for graph visualization
 */
export interface DependencyGraphEdge {
  from: number; // moduleId
  to: number; // moduleId
  importType: string;
  importedSymbols: string[] | null;
}

/**
 * Complete dependency graph for visualization
 */
export interface DependencyGraph {
  nodes: DependencyGraphNode[];
  edges: DependencyGraphEdge[];
}

/**
 * Legacy paginated result format (for compatibility with data.remote.ts)
 */
export interface LegacyPaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/**
 * Legacy comparison result format (for compatibility with data.remote.ts)
 */
export interface LegacyAnalysisComparison {
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

/**
 * Bundle query result
 */
export interface Bundle {
  id: number;
  analysisRunId: number;
  fileName: string;
  fileType: string;
  size: number;
  gzipSize: number | null;
}

/**
 * Chunk query result
 */
export interface Chunk {
  id: number;
  analysisRunId: number;
  name: string | null;
  totalSize: number;
  isEntry: boolean;
  isAsync: boolean;
}

/**
 * Suggestion query result
 */
export interface Suggestion {
  id: number;
  analysisRunId: number;
  type: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
}

/**
 * Suggestion with linked entities
 */
export interface SuggestionWithLinks extends Suggestion {
  links: SuggestionLinkEntity[];
}

/**
 * Linked entity for a suggestion
 */
export interface SuggestionLinkEntity {
  entityType: 'Module' | 'Symbol' | 'Dependency' | 'Chunk';
  entityId: number;
  entityPath?: string;
}

/**
 * Treemap node for hierarchical visualization
 */
export interface TreemapNode {
  name: string;
  value?: number;
  children?: TreemapNode[];
  // Additional metadata for visualization
  moduleId?: number;
  symbolId?: number;
  fileType?: string;
  isThirdParty?: boolean;
  packageName?: string | null;
  filePath?: string;
  originalSize?: number;
  bundledSize?: number;
  gzipSize?: number;
}
