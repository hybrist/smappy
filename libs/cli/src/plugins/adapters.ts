/**
 * Adapter pattern for converting bundler-specific outputs to normalized ingestion input
 * Provides abstract base classes and interfaces for bundler adapters
 */

import type { BundleInput, ChunkInput, ModuleInput } from "@smappy/core";
import type { IngestionOptions } from "../ingestion/index.ts";
import type {
  BundlerPluginOptions,
  PluginConfig,
  PluginExtractionResult,
  BundlerModule,
  BundlerChunk,
  BundlerBundle,
} from "./types.ts";
import {
  extractSourceMap,
  detectFileType,
  normalizePath,
  resolveModulePath,
  shouldExcludeFile,
  shouldIncludeFile,
  isModuleFile,
} from "./utils.ts";

// ============================================================================
// Abstract Adapter Base Class
// ============================================================================

/**
 * Abstract base class for bundler adapters
 * Provides common functionality for converting bundler output to normalized input
 */
export abstract class BundlerAdapter {
  /** Base directory for resolving paths */
  protected baseDir: string;
  /** Plugin options */
  protected options: BundlerPluginOptions;
  /** Plugin configuration */
  protected config?: PluginConfig;

  constructor(
    baseDir: string,
    options: BundlerPluginOptions,
    config?: PluginConfig,
  ) {
    this.baseDir = baseDir || process.cwd();
    this.options = options;
    this.config = config;
  }

  /**
   * Extract normalized data from bundler output
   * Must be implemented by concrete adapter classes
   *
   * @param bundlerOutput - Bundler-specific output
   * @returns Normalized extraction result
   */
  abstract extract(
    bundlerOutput: unknown,
  ): PluginExtractionResult | Promise<PluginExtractionResult>;

  /**
   * Convert bundler modules to normalized ModuleInput
   * Override this method for bundler-specific module parsing
   *
   * @param bundlerModules - Modules from bundler output
   * @param errors - Array to collect errors
   * @returns Array of normalized ModuleInput
   */
  protected convertModules(
    bundlerModules: BundlerModule[],
    _errors: string[],
  ): ModuleInput[] {
    const modules: ModuleInput[] = [];

    for (const bundlerModule of bundlerModules) {
      const filePath = normalizePath(bundlerModule.identifier, this.baseDir);

      // Apply filters
      if (
        this.options.excludePatterns &&
        shouldExcludeFile(filePath, this.options.excludePatterns)
      ) {
        continue;
      }

      if (
        this.options.includePatterns &&
        !shouldIncludeFile(filePath, this.options.includePatterns)
      ) {
        continue;
      }

      // Skip third-party modules if configured
      if (
        !this.options.analyzeThirdParty &&
        bundlerModule.identifier.includes("node_modules")
      ) {
        continue;
      }

      // Only process module files
      if (!isModuleFile(bundlerModule.identifier)) {
        continue;
      }
      const sourceContent = bundlerModule.source || "";
      const fileType = detectFileType(filePath);

      modules.push({
        filePath,
        sourceContent,
        fileType,
      });
    }

    return modules;
  }

  /**
   * Convert bundler chunks to normalized ChunkInput
   * Override this method for bundler-specific chunk parsing
   *
   * @param bundlerChunks - Chunks from bundler output
   * @param errors - Array to collect errors
   * @returns Array of normalized ChunkInput
   */
  protected convertChunks(
    bundlerChunks: BundlerChunk[],
    _errors: string[],
  ): ChunkInput[] {
    const chunks: ChunkInput[] = [];

    for (const bundlerChunk of bundlerChunks) {
      chunks.push({
        name: bundlerChunk.name,
        isEntry: bundlerChunk.isEntry ?? false,
        isAsync: bundlerChunk.isAsync ?? false,
        moduleIds: bundlerChunk.modules || [],
      });
    }

    return chunks;
  }

  /**
   * Convert bundler bundles to normalized BundleInput
   * Override this method for bundler-specific bundle parsing
   *
   * @param bundlerBundles - Bundles from bundler output
   * @param errors - Array to collect errors
   * @returns Array of normalized BundleInput
   */
  protected convertBundles(
    bundlerBundles: BundlerBundle[],
    _errors: string[],
  ): BundleInput[] {
    const bundles: BundleInput[] = [];

    for (const bundlerBundle of bundlerBundles) {
      const bundleContent = bundlerBundle.content || "";
      const bundlePath = bundlerBundle.fileName;
      const detectedType = detectFileType(bundlePath);
      // BundleInput only accepts JS/TS types, not CSS/JSON
      const bundleType: BundleInput["type"] =
        detectedType === "js" ||
        detectedType === "mjs" ||
        detectedType === "cjs" ||
        detectedType === "jsx" ||
        detectedType === "tsx" ||
        detectedType === "ts"
          ? detectedType
          : "js";

      // Extract source map if enabled
      let sourceMapReference: string | undefined;
      if (this.options.extractSourceMaps !== false) {
        if (bundlerBundle.sourceMap) {
          sourceMapReference = bundlerBundle.sourceMap;
        } else if (bundleContent) {
          const extracted = extractSourceMap(
            bundleContent,
            bundlePath,
            this.options.outputDir,
          );
          sourceMapReference = extracted;
        }
      }

      bundles.push({
        fileName: bundlePath,
        content: bundleContent,
        type: bundleType,
        sourceMapReference,
      });
    }

    return bundles;
  }

  /**
   * Create IngestionOptions from plugin options
   *
   * @param bundlerType - Type of bundler
   * @returns IngestionOptions
   */
  protected createIngestionOptions(
    bundlerType: IngestionOptions["bundlerType"],
  ): IngestionOptions {
    return {
      bundlerType,
      projectName: this.options.projectName,
      enableIncremental: this.options.enableIncremental,
      compareWithPrevious: this.options.compareWithPrevious,
      maxHistorySize: this.options.maxHistorySize,
    };
  }

  /**
   * Resolve module dependencies from bundler output
   * Override this method for bundler-specific dependency extraction
   *
   * @param bundlerModules - Modules from bundler output
   * @returns Map of module paths to their dependencies
   */
  protected resolveDependencies(
    bundlerModules: BundlerModule[],
  ): Map<string, string[]> {
    const dependencies = new Map<string, string[]>();

    for (const bundlerModule of bundlerModules) {
      const modulePath = normalizePath(bundlerModule.identifier, this.baseDir);
      const moduleDeps: string[] = [];

      if (bundlerModule.dependencies) {
        for (const dep of bundlerModule.dependencies) {
          const resolved = resolveModulePath(dep, modulePath, this.baseDir);
          moduleDeps.push(resolved);
        }
      }

      dependencies.set(modulePath, moduleDeps);
    }

    return dependencies;
  }
}

// ============================================================================
// Adapter Factory Interface
// ============================================================================

/**
 * Factory function type for creating bundler adapters
 */
export type AdapterFactory = (
  baseDir: string,
  options: BundlerPluginOptions,
  config?: PluginConfig,
) => BundlerAdapter;

/**
 * Registry for bundler adapters
 * Maps bundler names to their adapter factories
 */
export class AdapterRegistry {
  private adapters = new Map<string, AdapterFactory>();

  /**
   * Register an adapter factory
   *
   * @param bundlerName - Name of the bundler
   * @param factory - Factory function to create the adapter
   */
  register(bundlerName: string, factory: AdapterFactory): void {
    this.adapters.set(bundlerName.toLowerCase(), factory);
  }

  /**
   * Get an adapter factory by bundler name
   *
   * @param bundlerName - Name of the bundler
   * @returns Adapter factory or undefined if not found
   */
  get(bundlerName: string): AdapterFactory | undefined {
    return this.adapters.get(bundlerName.toLowerCase());
  }

  /**
   * Check if an adapter is registered
   *
   * @param bundlerName - Name of the bundler
   * @returns True if adapter is registered
   */
  has(bundlerName: string): boolean {
    return this.adapters.has(bundlerName.toLowerCase());
  }

  /**
   * Get all registered bundler names
   *
   * @returns Array of registered bundler names
   */
  list(): string[] {
    return Array.from(this.adapters.keys());
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a default adapter instance
 * Useful for testing and development
 *
 * @param baseDir - Base directory
 * @param options - Plugin options
 * @param config - Plugin configuration
 * @returns A basic adapter instance (throws if used - meant to be extended)
 */
export function createDefaultAdapter(
  baseDir: string,
  options: BundlerPluginOptions,
  config?: PluginConfig,
): BundlerAdapter {
  return new (class extends BundlerAdapter {
    extract(): PluginExtractionResult {
      throw new Error("Default adapter cannot extract - must be extended");
    }
  })(baseDir, options, config);
}
