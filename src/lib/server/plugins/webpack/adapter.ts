/**
 * Webpack adapter for bundle analysis
 * Extracts bundle data from webpack stats and converts it to normalized ingestion input
 */

import type {
  PluginExtractionResult,
  BundlerModule,
  BundlerChunk,
  BundlerBundle,
} from '../types.js';
import { BundlerAdapter } from '../adapters.js';
import { normalizePath, extractSourceMap, readFileContent } from '../utils.js';
import type { Stats, Compilation } from 'webpack';

// ============================================================================
// Webpack Stats Types
// ============================================================================

/**
 * Webpack stats output structure
 */
interface WebpackStatsOutput {
  stats: Stats;
  compilation: Compilation;
  outputPath: string;
}

// ============================================================================
// Webpack Adapter Implementation
// ============================================================================

/**
 * Adapter for extracting bundle data from webpack builds
 */
export class WebpackAdapter extends BundlerAdapter {
  /**
   * Extract normalized data from webpack stats
   *
   * @param bundlerOutput - Webpack Stats and Compilation
   * @returns Normalized extraction result
   */
  extract(bundlerOutput: unknown): PluginExtractionResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!this.isWebpackStats(bundlerOutput)) {
      errors.push('Invalid webpack stats output format');
      return this.createEmptyResult(errors, warnings);
    }

    const webpackOutput = bundlerOutput as WebpackStatsOutput;
    const { stats, compilation, outputPath } = webpackOutput;

    try {
      // Get stats as JSON
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const statsJson: any = stats.toJson({
        all: false,
        modules: true,
        chunks: true,
        assets: true,
        chunkModules: true,
        chunkOrigins: true,
        reasons: true,
        source: false, // Don't include source in stats for performance
      });

      // Convert webpack stats to our normalized types
      const bundlerModules = this.extractModules(statsJson, compilation, outputPath, errors);
      const bundlerChunks = this.extractChunks(statsJson, errors);
      const bundlerBundles = this.extractBundles(statsJson, compilation, outputPath, errors);

      // Use base class conversion methods
      const modules = this.convertModules(bundlerModules, errors);
      const chunks = this.convertChunks(bundlerChunks, errors);
      const bundles = this.convertBundles(bundlerBundles, errors);

      // Create ingestion options
      const options = this.createIngestionOptions('webpack');

      return {
        bundles,
        modules,
        chunks,
        options,
        warnings,
        errors,
      };
    } catch (error) {
      errors.push(
        `Failed to extract bundle data: ${error instanceof Error ? error.message : String(error)}`,
      );
      return this.createEmptyResult(errors, warnings);
    }
  }

  /**
   * Extract modules from webpack stats
   */
  private extractModules(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    statsJson: any,
    compilation: Compilation,
    _outputPath: string,
    _errors: string[],
  ): BundlerModule[] {
    const modules: BundlerModule[] = [];
    const moduleMap = new Map<string, BundlerModule>();

    // Process modules from stats
    if (statsJson.modules) {
      for (const module of statsJson.modules) {
        const moduleId = module.identifier || module.name || '';
        if (!moduleId) continue;

        // Skip node_modules unless configured
        if (!this.options.analyzeThirdParty && moduleId.includes('node_modules')) {
          continue;
        }

        // Try to get source content from compilation
        let source: string | undefined;
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const moduleGraph = compilation.moduleGraph as any;
          const moduleFromCompilation =
            moduleGraph.getModuleById?.(moduleId) || moduleGraph.getModule?.(moduleId);
          if (moduleFromCompilation) {
            // Try to get source from module
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const sourceModule = moduleFromCompilation as any;
            if (sourceModule._source && sourceModule._source._value) {
              source = sourceModule._source._value;
            } else if (sourceModule.originalSource) {
              source = sourceModule.originalSource.source();
            }
          }
        } catch {
          // Source not available, try reading from file system
          try {
            const modulePath = this.resolveModulePath(moduleId, _outputPath);
            source = readFileContent(modulePath);
          } catch {
            // Source not available, that's okay
          }
        }

        // Extract dependencies from reasons
        const dependencies: string[] = [];
        if (module.reasons) {
          for (const reason of module.reasons) {
            if (reason.module) {
              dependencies.push(reason.module);
            }
          }
        }

        const bundlerModule: BundlerModule = {
          identifier: moduleId,
          name: module.name || moduleId,
          size: module.size,
          source,
          dependencies: [...new Set(dependencies)], // Deduplicate
          reasons: module.reasons || [],
        };

        moduleMap.set(moduleId, bundlerModule);
        modules.push(bundlerModule);
      }
    }

    // Also process chunk modules
    if (statsJson.chunks) {
      for (const chunk of statsJson.chunks) {
        if (chunk.modules) {
          for (const module of chunk.modules) {
            const moduleId = module.identifier || module.name || '';
            if (!moduleId || moduleMap.has(moduleId)) {
              continue; // Already processed
            }

            // Skip node_modules unless configured
            if (!this.options.analyzeThirdParty && moduleId.includes('node_modules')) {
              continue;
            }

            // Try to get source content
            let source: string | undefined;
            try {
              const modulePath = this.resolveModulePath(moduleId, _outputPath);
              source = readFileContent(modulePath);
            } catch {
              // Source not available
            }

            const bundlerModule: BundlerModule = {
              identifier: moduleId,
              name: module.name || moduleId,
              size: module.size,
              source,
              dependencies: [],
              reasons: module.reasons || [],
            };

            moduleMap.set(moduleId, bundlerModule);
            modules.push(bundlerModule);
          }
        }
      }
    }

    return modules;
  }

  /**
   * Extract chunks from webpack stats
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractChunks(statsJson: any, _errors: string[]): BundlerChunk[] {
    const chunks: BundlerChunk[] = [];

    if (!statsJson.chunks) {
      return chunks;
    }

    for (const chunk of statsJson.chunks) {
      const chunkName = chunk.names?.[0] || chunk.id?.toString() || 'unknown';
      const moduleIds: string[] = [];

      // Collect module IDs from chunk
      if (chunk.modules) {
        for (const module of chunk.modules) {
          const moduleId = module.identifier || module.name || '';
          if (moduleId) {
            moduleIds.push(moduleId);
          }
        }
      }

      chunks.push({
        name: chunkName,
        size: chunk.size,
        modules: [...new Set(moduleIds)], // Deduplicate
        isEntry: chunk.entry || chunk.initial || false,
        isAsync: chunk.async || false,
        files: chunk.files || [],
      });
    }

    return chunks;
  }

  /**
   * Extract bundles (output files) from webpack stats
   */
  private extractBundles(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    statsJson: any,
    _compilation: Compilation,
    _outputPath: string,
    _errors: string[],
  ): BundlerBundle[] {
    const bundles: BundlerBundle[] = [];

    if (!statsJson.assets) {
      return bundles;
    }

    for (const asset of statsJson.assets) {
      const fileName = asset.name;
      if (!fileName) continue;

      // Only process JavaScript files
      if (!fileName.endsWith('.js') && !fileName.endsWith('.mjs') && !fileName.endsWith('.cjs')) {
        continue;
      }

      // Read bundle content
      let content: string | undefined;
      let sourceMap: string | undefined;

      try {
        const bundlePath = this.resolveBundlePath(fileName, _outputPath);
        content = readFileContent(bundlePath);

        // Extract source map if enabled
        if (this.options.extractSourceMaps !== false && content) {
          // Check for separate source map file
          const sourceMapPath = bundlePath + '.map';
          try {
            sourceMap = readFileContent(sourceMapPath);
          } catch {
            // Try to extract from content
            sourceMap = extractSourceMap(content, bundlePath, _outputPath);
          }
        }
      } catch (error) {
        // Bundle file not found or not readable
        if (this.config?.debug) {
          console.warn(`Failed to read bundle ${fileName}:`, error);
        }
      }

      // Get chunks for this bundle
      const chunks: string[] = [];
      if (statsJson.chunks) {
        for (const chunk of statsJson.chunks) {
          if (chunk.files && chunk.files.includes(fileName)) {
            const chunkName = chunk.names?.[0] || chunk.id?.toString() || '';
            if (chunkName) {
              chunks.push(chunkName);
            }
          }
        }
      }

      bundles.push({
        fileName,
        content,
        size: content?.length || asset.size || 0,
        sourceMap,
        chunks,
      });
    }

    return bundles;
  }

  /**
   * Resolve module path from module identifier
   */
  private resolveModulePath(moduleId: string, _outputPath: string): string {
    // Remove webpack-specific prefixes
    let cleanId = moduleId;
    if (cleanId.startsWith('multi ')) {
      cleanId = cleanId.replace(/^multi /, '');
    }
    if (cleanId.includes('!')) {
      // Webpack loader syntax: loader!path
      cleanId = cleanId.split('!').pop() || cleanId;
    }

    // If it's already an absolute path, return it normalized
    if (cleanId.startsWith('/') || cleanId.match(/^[A-Z]:/)) {
      return normalizePath(cleanId, this.baseDir);
    }

    // Try to resolve relative to base directory
    return normalizePath(cleanId, this.baseDir);
  }

  /**
   * Resolve bundle file path
   */
  private resolveBundlePath(fileName: string, _outputPath: string): string {
    if (fileName.startsWith('/')) {
      return fileName;
    }
    return normalizePath(fileName, this.baseDir);
  }

  /**
   * Type guard for webpack stats output
   */
  private isWebpackStats(output: unknown): output is WebpackStatsOutput {
    if (!output || typeof output !== 'object') {
      return false;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj = output as Record<string, any>;
    return (
      'stats' in obj &&
      typeof obj.stats === 'object' &&
      obj.stats !== null &&
      'compilation' in obj &&
      typeof obj.compilation === 'object' &&
      obj.compilation !== null
    );
  }

  /**
   * Create empty result with errors
   */
  private createEmptyResult(errors: string[], warnings: string[]): PluginExtractionResult {
    return {
      bundles: [],
      modules: [],
      chunks: [],
      options: this.createIngestionOptions('webpack'),
      warnings,
      errors,
    };
  }
}
