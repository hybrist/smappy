/**
 * Plugin types and interfaces for bundler integration
 * Defines the shared type system for all bundler plugins
 */

import type {
  BundleInput,
  ChunkInput,
  ModuleInput,
  IngestionOptions,
} from '../ingestion/types/index.js';

// ============================================================================
// Plugin Options
// ============================================================================

/**
 * Base options for all bundler plugins
 * Extended by specific bundler plugin implementations
 */
export interface BundlerPluginOptions {
  /** Name of the project being analyzed */
  projectName: string;
  /** Whether to enable incremental analysis */
  enableIncremental?: boolean;
  /** Whether to compare with previous analysis results */
  compareWithPrevious?: boolean;
  /** Maximum number of previous results to keep */
  maxHistorySize?: number;
  /** Custom output directory for analysis results */
  outputDir?: string;
  /** Whether to extract source maps */
  extractSourceMaps?: boolean;
  /** Whether to analyze third-party modules */
  analyzeThirdParty?: boolean;
  /** File patterns to exclude from analysis */
  excludePatterns?: string[];
  /** File patterns to include in analysis */
  includePatterns?: string[];
}

/**
 * Plugin-specific configuration
 * Can be extended by individual plugin implementations
 */
export interface PluginConfig {
  /** Debug mode for detailed logging */
  debug?: boolean;
  /** Custom path mappings for module resolution */
  pathMappings?: Record<string, string>;
}

// ============================================================================
// Plugin Output Types
// ============================================================================

/**
 * Result from a bundler plugin extraction
 * Normalized output that can be fed into the ingestion system
 */
export interface PluginExtractionResult {
  /** Bundles extracted from the build */
  bundles: BundleInput[];
  /** Source modules extracted from the build */
  modules: ModuleInput[];
  /** Chunks (code-split entry points) extracted from the build */
  chunks: ChunkInput[];
  /** Ingestion options configured by the plugin */
  options: IngestionOptions;
  /** Warnings encountered during extraction */
  warnings: string[];
  /** Errors encountered during extraction (non-fatal) */
  errors: string[];
}

// ============================================================================
// Plugin Interface
// ============================================================================

/**
 * Base interface for all bundler plugins
 * All bundler-specific plugins must implement this interface
 */
export interface BundlerPlugin {
  /** Name of the bundler this plugin supports */
  readonly bundlerName: string;
  /** Version of the bundler this plugin supports */
  readonly bundlerVersion?: string;

  /**
   * Extract bundle data from bundler output
   * Converts bundler-specific output into normalized ingestion input
   *
   * @param bundlerOutput - Bundler-specific output (stats, manifest, etc.)
   * @param options - Plugin options
   * @param config - Plugin-specific configuration
   * @returns Normalized extraction result ready for ingestion
   */
  extract(
    bundlerOutput: unknown,
    options: BundlerPluginOptions,
    config?: PluginConfig,
  ): PluginExtractionResult | Promise<PluginExtractionResult>;
}

// ============================================================================
// Bundler Stats Types (Common Patterns)
// ============================================================================

/**
 * Common structure for module information across bundlers
 */
export interface BundlerModule {
  /** Module identifier (path, ID, etc.) */
  identifier: string;
  /** Module name or path */
  name?: string;
  /** Module size in bytes */
  size?: number;
  /** Source content (if available) */
  source?: string;
  /** Source map content (if available) */
  sourceMap?: string;
  /** Dependencies (imports) */
  dependencies?: string[];
  /** Reasons for inclusion in bundle */
  reasons?: Array<{
    type?: string;
    module?: string;
    userRequest?: string;
  }>;
}

/**
 * Common structure for chunk information across bundlers
 */
export interface BundlerChunk {
  /** Chunk name or ID */
  name: string;
  /** Chunk size in bytes */
  size?: number;
  /** List of module IDs in this chunk */
  modules?: string[];
  /** Whether this is an entry chunk */
  isEntry?: boolean;
  /** Whether this chunk is loaded asynchronously */
  isAsync?: boolean;
  /** Files generated for this chunk */
  files?: string[];
}

/**
 * Common structure for bundle information across bundlers
 */
export interface BundlerBundle {
  /** Bundle file name */
  fileName: string;
  /** Bundle content */
  content?: string;
  /** Bundle size in bytes */
  size?: number;
  /** Source map content */
  sourceMap?: string;
  /** Chunks included in this bundle */
  chunks?: string[];
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if an object is a BundlerPlugin
 */
export function isBundlerPlugin(obj: unknown): obj is BundlerPlugin {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'bundlerName' in obj &&
    'extract' in obj &&
    typeof (obj as BundlerPlugin).extract === 'function'
  );
}

/**
 * Type guard to check if an object matches BundlerModule structure
 */
export function isBundlerModule(obj: unknown): obj is BundlerModule {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'identifier' in obj &&
    typeof (obj as BundlerModule).identifier === 'string'
  );
}

/**
 * Type guard to check if an object matches BundlerChunk structure
 */
export function isBundlerChunk(obj: unknown): obj is BundlerChunk {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'name' in obj &&
    typeof (obj as BundlerChunk).name === 'string'
  );
}
