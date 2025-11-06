/**
 * Webpack plugin for bundle analysis
 * Extracts bundle data during webpack builds and feeds it into the ingestion system
 */

import type { Compiler, Stats } from 'webpack';
import type { BundlerPluginOptions, PluginConfig } from '../types.js';
import { WebpackAdapter } from './adapter.js';
import { ingestBundle } from '../../ingestion/index.js';
import type { BundleIngestionInput } from '../../ingestion/index.js';
import { resolve } from 'node:path';

// ============================================================================
// Plugin Options
// ============================================================================

/**
 * Options for the Webpack bundle analysis plugin
 */
export interface WebpackPluginOptions extends BundlerPluginOptions {
  /** Whether to automatically ingest bundles after build */
  autoIngest?: boolean;
  /** Output directory where bundles are written (defaults to webpack output.path) */
  buildOutputDir?: string;
  /** Whether to analyze only production builds */
  productionOnly?: boolean;
}

// ============================================================================
// Plugin Implementation
// ============================================================================

/**
 * Webpack plugin class for bundle analysis
 */
export class WebpackBundleAnalysisPlugin {
  private options: WebpackPluginOptions;
  private config?: PluginConfig;
  private rootDir: string;

  constructor(options: WebpackPluginOptions, config?: PluginConfig) {
    this.options = options;
    this.config = config;
    this.rootDir = process.cwd();
  }

  /**
   * Apply the plugin to webpack compiler
   */
  apply(compiler: Compiler): void {
    const pluginName = 'webpack-bundle-analysis';

    // Hook into compilation completion
    compiler.hooks.done.tapAsync(pluginName, async (stats: Stats, callback: () => void) => {
      // Skip if productionOnly is set and this is not a production build
      if (this.options.productionOnly && compiler.options.mode !== 'production') {
        callback();
        return;
      }

      try {
        // Get output path from webpack config
        const outputPath =
          this.options.buildOutputDir ||
          compiler.options.output?.path ||
          resolve(this.rootDir, 'dist');

        // Create adapter instance
        const adapter = new WebpackAdapter(this.rootDir, this.options, this.config);

        // Extract bundle data
        // Note: stats.compilation might not be available in all webpack versions
        // Use stats.compilation if available, otherwise use a fallback
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const compilation: any =
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (stats as any).compilation || (compiler as any).compilation || compiler.hooks.compilation;
        const extractionResult = adapter.extract({
          stats,
          compilation,
          outputPath: outputPath,
        });

        // Log warnings and errors
        if (extractionResult.warnings.length > 0) {
          console.warn('[Webpack Bundle Analysis] Warnings:', extractionResult.warnings);
        }
        if (extractionResult.errors.length > 0) {
          console.error('[Webpack Bundle Analysis] Errors:', extractionResult.errors);
        }

        // Auto-ingest if enabled
        if (this.options.autoIngest !== false) {
          const ingestionInput: BundleIngestionInput = {
            bundles: extractionResult.bundles,
            modules: extractionResult.modules,
            chunks: extractionResult.chunks,
            options: extractionResult.options,
          };

          try {
            const result = await ingestBundle(ingestionInput);
            console.log(
              `[Webpack Bundle Analysis] Ingested ${extractionResult.bundles.length} bundles, ` +
                `${extractionResult.modules.length} modules, ${extractionResult.chunks.length} chunks. ` +
                `Analysis run ID: ${result.analysisRunId}`,
            );
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('[Webpack Bundle Analysis] Failed to ingest bundles:', errorMessage);
            if (this.config?.debug) {
              console.error('Full error details:', error);
            }
          }
        }

        callback();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[Webpack Bundle Analysis] Failed to analyze bundle:', errorMessage);
        if (this.config?.debug) {
          console.error('Full error details:', error);
        }
        callback();
      }
    });
  }
}

/**
 * Create a webpack plugin for bundle analysis
 *
 * @param options - Plugin options
 * @param config - Plugin configuration
 * @returns Webpack plugin instance
 */
export function webpackBundleAnalysisPlugin(
  options: WebpackPluginOptions,
  config?: PluginConfig,
): WebpackBundleAnalysisPlugin {
  return new WebpackBundleAnalysisPlugin(options, config);
}

/**
 * Default export for easier importing
 */
export default webpackBundleAnalysisPlugin;
