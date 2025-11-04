/**
 * TypeScript interfaces for the bundle ingestion system
 */

// ============================================================================
// Input Interfaces - Used for programmatic bundle ingestion API
// ============================================================================

/**
 * Input for a bundle to be ingested
 * Used for the programmatic API to ingest bundles
 */
export interface BundleInput {
  /** File name of the bundle */
  fileName: string;
  /** Bundle content as a string */
  content: string;
  /** Type of the bundle file (e.g., 'js', 'mjs', 'cjs') */
  type: 'js' | 'mjs' | 'cjs' | 'jsx' | 'tsx' | 'ts';
  /** Optional reference to source map content */
  sourceMapReference?: string;
}

/**
 * Input for a chunk within a bundle
 * Represents a code-split chunk or entry point
 */
export interface ChunkInput {
  /** Name of the chunk */
  name: string;
  /** Whether this chunk is an entry point */
  isEntry: boolean;
  /** Whether this chunk is loaded asynchronously */
  isAsync: boolean;
  /** List of module identifiers included in this chunk */
  moduleIds: string[];
}

/**
 * Input for a module within a bundle
 * Represents a single source file
 */
export interface ModuleInput {
  /** File path of the module */
  filePath: string;
  /** Source content of the module */
  sourceContent: string;
  /** File type (extension) */
  fileType: 'js' | 'mjs' | 'cjs' | 'jsx' | 'ts' | 'tsx' | 'json' | 'css';
}

/**
 * Options for the ingestion process
 * Controls how bundles are analyzed and stored
 */
export interface IngestionOptions {
  /** Type of bundler that generated this bundle */
  bundlerType: 'webpack' | 'rollup' | 'esbuild' | 'vite' | 'parcel' | 'other';
  /** Name of the project being analyzed */
  projectName: string;
  /** Whether to perform incremental analysis */
  enableIncremental?: boolean;
  /** Whether to compare with previous analysis results */
  compareWithPrevious?: boolean;
  /** Maximum number of previous results to keep */
  maxHistorySize?: number;
}

// ============================================================================
// Legacy Interfaces - Maintained for backward compatibility
// ============================================================================

/**
 * Represents a JavaScript bundle to be analyzed
 * @deprecated Use BundleInput instead
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

// ============================================================================
// Internal Types - Used for analysis and processing
// ============================================================================

/**
 * Parsed symbol information with position data
 * Represents a symbol extracted from AST analysis with detailed location information
 */
export interface ParsedSymbol {
  /** Symbol name */
  name: string;
  /** Symbol type (function, class, variable, etc.) */
  type: 'function' | 'class' | 'variable' | 'import' | 'export' | 'const' | 'let';
  /** Location in source code with line and column information */
  location: {
    /** Start position of the symbol */
    start: { line: number; column: number };
    /** End position of the symbol */
    end: { line: number; column: number };
  };
  /** Size in bytes attributed to this symbol */
  size: number;
  /** Scope information (global, module, function, block) */
  scope?: 'global' | 'module' | 'function' | 'block';
}

/**
 * Parsed dependency information
 * Represents import/export relationships between modules
 */
export interface ParsedDependency {
  /** Source module path */
  source: string;
  /** Target module path being imported/exported */
  target: string;
  /** Type of dependency relationship */
  type: 'import' | 'export' | 're-export' | 'dynamic-import';
  /** Imported names (for named imports) */
  importedNames?: string[];
  /** Whether this is a default import/export */
  isDefault?: boolean;
  /** Whether this is a namespace import (import * as) */
  isNamespace?: boolean;
  /** Location in source code */
  location?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
}

/**
 * Size information for bundles and modules
 * Contains raw, gzipped, and attributed size metrics
 */
export interface SizeInfo {
  /** Raw size in bytes (uncompressed) */
  raw: number;
  /** Gzipped size in bytes */
  gzipped: number;
  /** Size attributed to individual modules or symbols */
  attributed?: Map<string, number>;
  /** Brotli compressed size (optional) */
  brotli?: number;
}

/**
 * Represents a symbol extracted from AST analysis
 * @deprecated Use ParsedSymbol instead
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

// ============================================================================
// Test Helpers - Factory functions for creating mock inputs
// ============================================================================

/**
 * Create a mock BundleInput for testing
 * @param overrides - Optional partial BundleInput to override defaults
 * @returns A complete BundleInput object
 */
export function createMockBundleInput(overrides?: Partial<BundleInput>): BundleInput {
  return {
    fileName: 'bundle.js',
    content: 'console.log("Hello, world!");',
    type: 'js',
    sourceMapReference: undefined,
    ...overrides,
  };
}

/**
 * Create a mock ChunkInput for testing
 * @param overrides - Optional partial ChunkInput to override defaults
 * @returns A complete ChunkInput object
 */
export function createMockChunkInput(overrides?: Partial<ChunkInput>): ChunkInput {
  return {
    name: 'main',
    isEntry: true,
    isAsync: false,
    moduleIds: ['./src/index.js'],
    ...overrides,
  };
}

/**
 * Create a mock ModuleInput for testing
 * @param overrides - Optional partial ModuleInput to override defaults
 * @returns A complete ModuleInput object
 */
export function createMockModuleInput(overrides?: Partial<ModuleInput>): ModuleInput {
  return {
    filePath: './src/index.js',
    sourceContent: 'export default function() {}',
    fileType: 'js',
    ...overrides,
  };
}

/**
 * Create a mock IngestionOptions for testing
 * @param overrides - Optional partial IngestionOptions to override defaults
 * @returns A complete IngestionOptions object
 */
export function createMockIngestionOptions(
  overrides?: Partial<IngestionOptions>,
): IngestionOptions {
  return {
    bundlerType: 'webpack',
    projectName: 'test-project',
    enableIncremental: false,
    compareWithPrevious: false,
    maxHistorySize: 10,
    ...overrides,
  };
}

/**
 * Create a mock ParsedSymbol for testing
 * @param overrides - Optional partial ParsedSymbol to override defaults
 * @returns A complete ParsedSymbol object
 */
export function createMockParsedSymbol(overrides?: Partial<ParsedSymbol>): ParsedSymbol {
  return {
    name: 'testFunction',
    type: 'function',
    location: {
      start: { line: 1, column: 0 },
      end: { line: 1, column: 10 },
    },
    size: 100,
    scope: 'module',
    ...overrides,
  };
}

/**
 * Create a mock ParsedDependency for testing
 * @param overrides - Optional partial ParsedDependency to override defaults
 * @returns A complete ParsedDependency object
 */
export function createMockParsedDependency(
  overrides?: Partial<ParsedDependency>,
): ParsedDependency {
  return {
    source: './src/index.js',
    target: './src/utils.js',
    type: 'import',
    importedNames: ['helper'],
    isDefault: false,
    isNamespace: false,
    ...overrides,
  };
}

/**
 * Create a mock SizeInfo for testing
 * @param overrides - Optional partial SizeInfo to override defaults
 * @returns A complete SizeInfo object
 */
export function createMockSizeInfo(overrides?: Partial<SizeInfo>): SizeInfo {
  return {
    raw: 1000,
    gzipped: 500,
    attributed: undefined,
    brotli: 450,
    ...overrides,
  };
}
