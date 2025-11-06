/**
 * Vite plugin for bundle analysis
 * Extracts bundle data during Vite builds and feeds it into the ingestion system
 */

import type { Plugin } from 'vite';
import type { BundlerPluginOptions, PluginConfig } from '../types.js';
import { ViteAdapter } from './adapter.js';
import { ingestBundle } from '../../ingestion/index.js';
import type { BundleIngestionInput } from '../../ingestion/index.js';
import { resolve } from 'node:path';

// ============================================================================
// Plugin Options
// ============================================================================

/**
 * Options for the Vite bundle analysis plugin
 */
export interface VitePluginOptions extends BundlerPluginOptions {
  /** Whether to automatically ingest bundles after build */
  autoIngest?: boolean;
  /** Output directory where bundles are written (defaults to 'dist') */
  buildOutputDir?: string;
  /** Whether to handle SSR builds separately */
  handleSSR?: boolean;
}

// ============================================================================
// Plugin Implementation
// ============================================================================

/**
 * Create a Vite plugin for bundle analysis
 *
 * @param options - Plugin options
 * @param config - Plugin configuration
 * @returns Vite plugin instance
 */
export function viteBundleAnalysisPlugin(
  options: VitePluginOptions,
  config?: PluginConfig,
): Plugin {
  const { autoIngest = true, buildOutputDir, ...pluginOptions } = options;

  let rootDir: string = process.cwd();
  let outputDir: string = 'dist';

  return {
    name: 'vite-bundle-analysis',
    enforce: 'post', // Run after other plugins

    /**
     * Capture root and output directory from config
     */
    configResolved(resolvedConfig) {
      rootDir = resolvedConfig.root;
      outputDir = buildOutputDir || resolvedConfig.build.outDir || 'dist';
    },

    /**
     * Process bundles after build completes
     * This hook is called for both client and SSR builds
     */
    async writeBundle(_options, bundle) {
      const currentBundle = bundle;

      // Vite handles SSR as a separate build, so we process each bundle independently
      // We can detect SSR builds by checking if this is called during SSR build
      // For now, we'll process all builds and let the adapter handle the distinction
      const isSSR = false; // SSR detection would require Vite-specific context

      try {
        // Create adapter instance
        const adapter = new ViteAdapter(rootDir, pluginOptions, config);

        // Extract bundle data
        const extractionResult = adapter.extract({
          bundle: currentBundle,
          outputDir: resolve(rootDir, outputDir),
          isSSR,
        });

        // Log warnings and errors
        if (extractionResult.warnings.length > 0) {
          console.warn('[Vite Bundle Analysis] Warnings:', extractionResult.warnings);
        }
        if (extractionResult.errors.length > 0) {
          console.error('[Vite Bundle Analysis] Errors:', extractionResult.errors);
        }

        // Auto-ingest if enabled
        if (autoIngest) {
          const ingestionInput: BundleIngestionInput = {
            bundles: extractionResult.bundles,
            modules: extractionResult.modules,
            chunks: extractionResult.chunks,
            options: extractionResult.options,
          };

          try {
            const result = await ingestBundle(ingestionInput);
            console.log(
              `[Vite Bundle Analysis] Ingested ${extractionResult.bundles.length} bundles, ` +
                `${extractionResult.modules.length} modules, ${extractionResult.chunks.length} chunks. ` +
                `Analysis run ID: ${result.analysisRunId}`,
            );
          } catch (error) {
            console.error('[Vite Bundle Analysis] Failed to ingest bundles:', error);
            if (config?.debug) {
              console.error(error);
            }
          }
        }

        // Extraction complete
      } catch (error) {
        console.error('[Vite Bundle Analysis] Failed to analyze bundle:', error);
        if (config?.debug) {
          console.error(error);
        }
      }
    },
  };
}

/**
 * Default export for easier importing
 */
export default viteBundleAnalysisPlugin;
