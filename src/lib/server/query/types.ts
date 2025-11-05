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
