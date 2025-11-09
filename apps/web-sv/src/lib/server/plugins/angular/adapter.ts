/**
 * Angular adapter for bundle analysis
 * Extracts bundle data from Angular CLI's esbuild-based application builder output
 */

import type {
  PluginExtractionResult,
  BundlerModule,
  BundlerChunk,
  BundlerBundle,
} from '../types.js';
import type { IngestionOptions } from '../../ingestion/index.js';
import { BundlerAdapter } from '../adapters.js';
import { extractSourceMap } from '../utils.js';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

// ============================================================================
// Angular Stats Types
// ============================================================================

/**
 * Angular stats.json structure from --stats-json flag
 * Based on esbuild metafile format with Angular-specific extensions
 */
interface AngularStatsJson {
  chunks?: Array<{
    id: string;
    names: string[];
    files: string[];
    entry?: boolean;
    initial?: boolean;
    async?: boolean;
    modules?: Array<{
      id: string;
      identifier: string;
      name: string;
      size: number;
    }>;
  }>;
  modules?: Array<{
    identifier: string;
    name: string;
    size: number;
    chunks?: string[];
  }>;
  assets?: Array<{
    name: string;
    size: number;
    chunks?: string[];
  }>;
}

/**
 * Angular builder output structure
 */
interface AngularBuildOutput {
  /** Path to the build output directory */
  outputPath: string;
  /** Optional stats.json content if available */
  stats?: AngularStatsJson;
  /** Whether this is an SSR build */
  isSSR?: boolean;
  /** Whether to try loading stats.json if not provided (default: true) */
  loadStats?: boolean;
}

// ============================================================================
// Angular Adapter Implementation
// ============================================================================

/**
 * Adapter for extracting bundle data from Angular CLI builds
 */
export class AngularAdapter extends BundlerAdapter {
  /**
   * Extract normalized data from Angular build output
   *
   * @param bundlerOutput - Angular build output with stats and output path
   * @returns Normalized extraction result
   */
  extract(bundlerOutput: unknown): PluginExtractionResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!this.isAngularBuildOutput(bundlerOutput)) {
      errors.push('Invalid Angular build output format');
      return this.createEmptyResult(errors, warnings);
    }

    const angularOutput = bundlerOutput as AngularBuildOutput;
    const { outputPath, stats, isSSR, loadStats = true } = angularOutput;

    try {
      // Try to load stats.json if not provided and loadStats is true
      const statsData = stats || (loadStats ? this.loadStatsJson(outputPath, errors) : null);

      let bundlerModules: BundlerModule[] = [];
      let bundlerChunks: BundlerChunk[] = [];
      let bundlerBundles: BundlerBundle[] = [];

      // Extract from stats.json if available
      if (statsData) {
        bundlerModules = this.extractModulesFromStats(statsData, errors);
        bundlerChunks = this.extractChunksFromStats(statsData, errors);
        bundlerBundles = this.extractBundlesFromStats(statsData, outputPath, errors);
      } else {
        // Fallback to extracting from output directory
        warnings.push('No stats.json found, extracting from output directory only');
        bundlerBundles = this.extractBundlesFromDirectory(outputPath, errors);
      }

      // Use base class conversion methods
      const modules = this.convertModules(bundlerModules, errors);
      const chunks = this.convertChunks(bundlerChunks, errors);
      const bundles = this.convertBundles(bundlerBundles, errors);

      // Create ingestion options
      const bundlerType = isSSR ? 'other' : 'esbuild'; // Angular uses esbuild
      const options = this.createIngestionOptions(bundlerType);

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
   * Type guard to check if output is Angular build output
   */
  private isAngularBuildOutput(output: unknown): output is AngularBuildOutput {
    return (
      typeof output === 'object' &&
      output !== null &&
      'outputPath' in output &&
      typeof (output as AngularBuildOutput).outputPath === 'string'
    );
  }

  /**
   * Load stats.json from output directory
   */
  private loadStatsJson(outputPath: string, _errors: string[]): AngularStatsJson | null {
    try {
      const statsPath = join(outputPath, 'stats.json');
      const statsContent = readFileSync(statsPath, 'utf-8');
      return JSON.parse(statsContent) as AngularStatsJson;
    } catch {
      // stats.json not found or not readable
      return null;
    }
  }

  /**
   * Extract modules from stats.json
   */
  private extractModulesFromStats(stats: AngularStatsJson, _errors: string[]): BundlerModule[] {
    const modules: BundlerModule[] = [];

    if (!stats.modules) {
      return modules;
    }

    for (const module of stats.modules) {
      modules.push({
        identifier: module.identifier || module.name,
        name: module.name,
        size: module.size,
        dependencies: [],
      });
    }

    return modules;
  }

  /**
   * Extract chunks from stats.json
   */
  private extractChunksFromStats(stats: AngularStatsJson, _errors: string[]): BundlerChunk[] {
    const chunks: BundlerChunk[] = [];

    if (!stats.chunks) {
      return chunks;
    }

    for (const chunk of stats.chunks) {
      const chunkName = chunk.names[0] || chunk.id;
      const moduleIds = chunk.modules ? chunk.modules.map((m) => m.id || m.identifier) : [];

      chunks.push({
        name: chunkName,
        isEntry: chunk.entry || chunk.initial || false,
        isAsync: chunk.async || false,
        modules: moduleIds,
        files: chunk.files,
      });
    }

    return chunks;
  }

  /**
   * Extract bundles from stats.json
   */
  private extractBundlesFromStats(
    stats: AngularStatsJson,
    outputPath: string,
    errors: string[],
  ): BundlerBundle[] {
    const bundles: BundlerBundle[] = [];

    if (!stats.assets) {
      return bundles;
    }

    for (const asset of stats.assets) {
      // Only process JavaScript bundles
      if (!asset.name.endsWith('.js') && !asset.name.endsWith('.mjs')) {
        continue;
      }

      try {
        const bundlePath = join(outputPath, asset.name);
        const content = readFileSync(bundlePath, 'utf-8');
        const sourceMap = this.extractSourceMapForBundle(bundlePath, outputPath);

        bundles.push({
          fileName: asset.name,
          content: content || '',
          size: asset.size,
          sourceMap: sourceMap || undefined,
          chunks: asset.chunks,
        });
      } catch (error) {
        errors.push(
          `Failed to read bundle ${asset.name}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return bundles;
  }

  /**
   * Recursively scan directory for files
   * Compatible with Node.js v10.10.0+ (withFileTypes option)
   */
  private scanDirectory(dir: string, files: string[] = [], baseDir: string = dir): string[] {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        const relativePath = fullPath.substring(baseDir.length + 1);

        if (entry.isDirectory()) {
          this.scanDirectory(fullPath, files, baseDir);
        } else if (entry.isFile()) {
          files.push(relativePath);
        }
      }
    } catch {
      // Ignore read errors for subdirectories
    }

    return files;
  }

  /**
   * Extract bundles from output directory (fallback when stats.json is not available)
   */
  private extractBundlesFromDirectory(outputPath: string, errors: string[]): BundlerBundle[] {
    const bundles: BundlerBundle[] = [];

    try {
      const files = this.scanDirectory(outputPath);

      for (const file of files) {
        const filePath = join(outputPath, file);
        const ext = extname(filePath);

        // Only process JavaScript files
        if (ext !== '.js' && ext !== '.mjs') {
          continue;
        }

        try {
          const stats = statSync(filePath);
          if (!stats.isFile()) {
            continue;
          }

          const content = readFileSync(filePath, 'utf-8');
          const sourceMap = this.extractSourceMapForBundle(filePath, outputPath);

          bundles.push({
            fileName: file,
            content,
            size: stats.size,
            sourceMap: sourceMap || undefined,
          });
        } catch (error) {
          errors.push(
            `Failed to read bundle ${file}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    } catch (error) {
      errors.push(
        `Failed to read output directory: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return bundles;
  }

  /**
   * Extract source map for a bundle
   * Tries both inline and external source maps
   */
  private extractSourceMapForBundle(bundlePath: string, _outputPath: string): string | null {
    if (!this.options.extractSourceMaps) {
      return null;
    }

    try {
      const bundleContent = readFileSync(bundlePath, 'utf-8');

      // Try inline source map first
      const inlineSourceMap = extractSourceMap(bundleContent, bundlePath);
      if (inlineSourceMap) {
        return inlineSourceMap;
      }

      // Try external source map file
      const sourceMapPath = bundlePath + '.map';
      try {
        return readFileSync(sourceMapPath, 'utf-8');
      } catch {
        // Source map file not found
        return null;
      }
    } catch {
      return null;
    }
  }

  /**
   * Create empty result with errors
   */
  protected createEmptyResult(errors: string[], warnings: string[]): PluginExtractionResult {
    return {
      bundles: [],
      modules: [],
      chunks: [],
      options: this.createIngestionOptions('esbuild'),
      warnings,
      errors,
    };
  }

  /**
   * Create ingestion options
   */
  protected createIngestionOptions(
    bundlerType: 'webpack' | 'rollup' | 'esbuild' | 'vite' | 'parcel' | 'nextjs' | 'other',
  ): IngestionOptions {
    return {
      bundlerType,
      projectName: this.options.projectName,
      enableIncremental: this.options.enableIncremental,
      compareWithPrevious: this.options.compareWithPrevious,
      maxHistorySize: this.options.maxHistorySize,
    };
  }
}
