/**
 * Angular CLI builder for bundle analysis
 * Integrates bundle analysis into Angular builds using Angular's builder API
 */

import type { BundlerPluginOptions, PluginConfig } from "../types.js";
import { AngularAdapter } from "./adapter.js";
import { ingestBundle } from "../../ingestion/index.js";
import type { BundleIngestionInput } from "../../ingestion/index.js";
import { resolve, join } from "node:path";
import { existsSync, readFileSync } from "node:fs";

// ============================================================================
// Plugin Options
// ============================================================================

/**
 * Options for the Angular bundle analysis builder
 */
export interface AngularBuilderOptions extends BundlerPluginOptions {
  /** Whether to automatically ingest bundles after build */
  autoIngest?: boolean;
  /** Output directory where bundles are written (defaults to dist/<project-name>) */
  buildOutputDir?: string;
  /** Whether to handle SSR builds separately */
  handleSSR?: boolean;
  /** Whether to use stats.json if available */
  useStatsJson?: boolean;
}

// ============================================================================
// Builder Function
// ============================================================================

/**
 * Angular CLI builder function for bundle analysis
 * This is intended to be used with Angular's Builder API
 *
 * @param options - Builder options
 * @param context - Builder context (optional, for Angular CLI integration)
 * @param config - Plugin configuration
 * @returns Promise resolving to success status
 */
export async function angularBundleAnalysisBuilder(
  options: AngularBuilderOptions,
  context?: {
    workspaceRoot?: string;
    logger?: {
      info: (message: string) => void;
      warn: (message: string) => void;
      error: (message: string) => void;
    };
  },
  config?: PluginConfig,
): Promise<{ success: boolean }> {
  const {
    autoIngest = true,
    buildOutputDir,
    useStatsJson = true,
    ...pluginOptions
  } = options;

  const rootDir = context?.workspaceRoot || process.cwd();
  const logger = context?.logger || console;

  // Validate required options
  if (!options.projectName) {
    logger.error("[Angular Bundle Analysis] projectName is required");
    return { success: false };
  }

  try {
    // Determine output directory
    const outputPath = buildOutputDir
      ? resolve(rootDir, buildOutputDir)
      : resolve(rootDir, "dist", options.projectName);

    // Check if output directory exists
    if (!existsSync(outputPath)) {
      logger.error(
        `[Angular Bundle Analysis] Output directory not found: ${outputPath}`,
      );
      return { success: false };
    }

    // Try to load stats.json if enabled
    let stats = null;
    if (useStatsJson) {
      const statsPath = join(outputPath, "stats.json");
      if (existsSync(statsPath)) {
        try {
          const statsContent = readFileSync(statsPath, "utf-8");
          stats = JSON.parse(statsContent);
          logger.info("[Angular Bundle Analysis] Loaded stats.json");
        } catch (error) {
          logger.warn(
            `[Angular Bundle Analysis] Failed to load stats.json: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      } else {
        logger.warn(
          "[Angular Bundle Analysis] stats.json not found, using output directory scan",
        );
      }
    }

    // Create adapter instance
    const adapter = new AngularAdapter(rootDir, pluginOptions, config);

    // Extract bundle data
    const extractionResult = adapter.extract({
      outputPath,
      stats,
      isSSR: options.handleSSR || false,
      loadStats: useStatsJson,
    });

    // Log warnings and errors
    if (extractionResult.warnings.length > 0) {
      logger.warn("[Angular Bundle Analysis] Warnings:");
      extractionResult.warnings.forEach((warning) =>
        logger.warn(`  - ${warning}`),
      );
    }
    if (extractionResult.errors.length > 0) {
      logger.error("[Angular Bundle Analysis] Errors:");
      extractionResult.errors.forEach((error) => logger.error(`  - ${error}`));
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
        logger.info(
          `[Angular Bundle Analysis] Ingested ${extractionResult.bundles.length} bundles, ` +
            `${extractionResult.modules.length} modules, ${extractionResult.chunks.length} chunks. ` +
            `Analysis run ID: ${result.analysisRunId}`,
        );
      } catch (error) {
        logger.error(
          `[Angular Bundle Analysis] Failed to ingest bundles: ${error instanceof Error ? error.message : String(error)}`,
        );
        if (config?.debug) {
          logger.error(String(error));
        }
        return { success: false };
      }
    }

    return { success: true };
  } catch (error) {
    logger.error(
      `[Angular Bundle Analysis] Failed to analyze bundle: ${error instanceof Error ? error.message : String(error)}`,
    );
    if (config?.debug) {
      logger.error(String(error));
    }
    return { success: false };
  }
}

/**
 * Default export for easier importing
 */
export default angularBundleAnalysisBuilder;
