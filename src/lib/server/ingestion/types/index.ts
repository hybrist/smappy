/**
 * TypeScript interfaces for the bundle ingestion system
 */

/**
 * Represents a JavaScript bundle to be analyzed
 */
export interface Bundle {
  /** Unique identifier for the bundle */
  id: string;
  /** Bundle file path or name */
  path: string;
  /** Bundle content */
  content: string;
  /** Source map content if available */
  sourceMap?: string;
}

/**
 * Represents a parsed source map
 */
export interface SourceMap {
  /** Source map version */
  version: number;
  /** List of source files */
  sources: string[];
  /** Source content */
  sourcesContent?: (string | null)[];
  /** Mapping information */
  mappings: string;
  /** Names array */
  names?: string[];
}

/**
 * Represents a symbol extracted from AST analysis
 */
export interface Symbol {
  /** Symbol name */
  name: string;
  /** Symbol type (function, class, variable, etc.) */
  type: 'function' | 'class' | 'variable' | 'import' | 'export';
  /** Location in source code */
  location: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  /** Size in bytes */
  size: number;
}

/**
 * Represents a node in the dependency graph
 */
export interface DependencyNode {
  /** Module path or identifier */
  id: string;
  /** List of dependencies */
  dependencies: string[];
  /** Size in bytes */
  size: number;
}

/**
 * Results from bundle analysis
 */
export interface AnalysisResult {
  /** Bundle identifier */
  bundleId: string;
  /** Extracted symbols */
  symbols: Symbol[];
  /** Dependency graph */
  dependencyGraph: DependencyNode[];
  /** Total size information */
  sizes: {
    total: number;
    gzipped: number;
  };
}
