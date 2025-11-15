/**
 * Next.js webpack plugin for bundle analysis
 * Wraps the webpack adapter with Next-specific configuration helpers
 */

import { resolve } from "node:path";
import type { Configuration, Compiler, Stats } from "webpack";
import type { BundlerPluginOptions, PluginConfig } from "../types.ts";
import type { BundleIngestionInput } from "../../ingestion/index.ts";
import { ingestBundle } from "../../ingestion/index.ts";
import {
  NextJsAdapter,
  type NextJsAdapterOptions,
  type NextJsBuildTarget,
  type NextJsRuntime,
} from "./adapter.ts";

/**
 * Options for configuring the Next.js bundle analysis plugin.
 * Extends the base bundler options with Next-specific fields.
 */
export interface NextJsPluginOptions extends BundlerPluginOptions {
  /** Automatically ingest bundles after extraction */
  autoIngest?: boolean;
  /** Optional override for build output directory */
  buildOutputDir?: string;
  /** Only run plugin during production builds */
  productionOnly?: boolean;
  /** Next.js build target handled by this plugin instance */
  buildTarget: NextJsBuildTarget;
  /** Execution runtime */
  runtime?: NextJsRuntime;
  /** Next.js dist directory (defaults to .next) */
  distDir?: string;
}

/**
 * Options for wrapping Next.js config
 */
export interface WithNextBundleAnalysisOptions
  extends Omit<NextJsPluginOptions, "buildTarget"> {
  analyzeClient?: boolean;
  analyzeServer?: boolean;
  analyzeEdge?: boolean;
  analyzeMiddleware?: boolean;
}

/**
 * Partial Next.js config interface (avoids direct dependency on next package)
 */
export interface NextConfig extends Record<string, unknown> {
  distDir?: string;
  webpack?: (
    config: Configuration,
    context: NextWebpackBuildContext,
  ) => Configuration | void;
}

/**
 * Shape of the build context passed by Next.js to the webpack override
 */
export interface NextWebpackBuildContext {
  dir: string;
  dev: boolean;
  isServer: boolean;
  nextRuntime?: NextJsRuntime;
  config: NextConfig;
  webpack: typeof import("webpack");
  [key: string]: unknown;
}

/**
 * Webpack plugin class for Next.js bundle analysis
 */
export class NextJsBundleAnalysisPlugin {
  private options: NextJsPluginOptions;
  private config?: PluginConfig;
  private rootDir: string;

  constructor(options: NextJsPluginOptions, config?: PluginConfig) {
    this.options = options;
    this.config = config;
    this.rootDir = process.cwd();
  }

  /**
   * Apply the plugin to a webpack compiler instance
   */
  apply(compiler: Compiler): void {
    const pluginName = `nextjs-bundle-analysis:${this.options.buildTarget}`;

    compiler.hooks.done.tapAsync(
      pluginName,
      async (stats: Stats, callback: () => void) => {
        if (
          this.options.productionOnly &&
          compiler.options.mode !== "production"
        ) {
          callback();
          return;
        }

        try {
          const outputPath =
            this.options.buildOutputDir ||
            compiler.options.output?.path ||
            resolve(this.rootDir, this.options.distDir ?? ".next");

          const adapterOptions: NextJsAdapterOptions = {
            ...this.options,
            buildTarget: this.options.buildTarget,
            runtime:
              this.options.runtime ??
              (this.options.buildTarget === "edge" ||
              this.options.buildTarget === "middleware"
                ? "edge"
                : "nodejs"),
          };

          const adapter = new NextJsAdapter(
            this.rootDir,
            adapterOptions,
            this.config,
          );

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const compilation: any =
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (stats as any).compilation ||
            (compiler as any).compilation ||
            compiler.hooks.compilation;

          const extractionResult = adapter.extract({
            stats,
            compilation,
            outputPath,
            buildTarget: this.options.buildTarget,
            runtime: adapterOptions.runtime,
          });

          if (extractionResult.warnings.length > 0) {
            console.warn(
              `[Next.js Bundle Analysis][${this.options.buildTarget}] Warnings:`,
              extractionResult.warnings,
            );
          }

          if (extractionResult.errors.length > 0) {
            console.error(
              `[Next.js Bundle Analysis][${this.options.buildTarget}] Errors:`,
              extractionResult.errors,
            );
          }

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
                `[Next.js Bundle Analysis][${this.options.buildTarget}] Ingested ${extractionResult.bundles.length} bundles, ` +
                  `${extractionResult.modules.length} modules, ${extractionResult.chunks.length} chunks. ` +
                  `Analysis run ID: ${result.analysisRunId}`,
              );
            } catch (error) {
              const errorMessage =
                error instanceof Error ? error.message : String(error);
              console.error(
                `[Next.js Bundle Analysis][${this.options.buildTarget}] Failed to ingest bundles:`,
                errorMessage,
              );
              if (this.config?.debug) {
                console.error("Full error details:", error);
              }
            }
          }

          callback();
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          console.error(
            `[Next.js Bundle Analysis][${this.options.buildTarget}] Failed to analyze bundle:`,
            errorMessage,
          );
          if (this.config?.debug) {
            console.error("Full error details:", error);
          }
          callback();
        }
      },
    );
  }
}

/**
 * Factory function to create a Next.js bundle analysis plugin
 */
export function nextJsBundleAnalysisPlugin(
  options: NextJsPluginOptions,
  config?: PluginConfig,
): NextJsBundleAnalysisPlugin {
  if (!options.buildTarget) {
    throw new Error(
      "nextJsBundleAnalysisPlugin requires a buildTarget (client, server, edge, or middleware)",
    );
  }

  return new NextJsBundleAnalysisPlugin(options, config);
}

/**
 * Convenience helper to wrap a Next.js config and inject the plugin automatically
 */
export function withNextBundleAnalysis(
  nextConfig: NextConfig = {},
  options: WithNextBundleAnalysisOptions,
  pluginConfig?: PluginConfig,
): NextConfig {
  const {
    analyzeClient = true,
    analyzeServer = true,
    analyzeEdge = true,
    analyzeMiddleware = true,
    distDir,
    ...pluginOptions
  } = options;

  const originalWebpack = nextConfig.webpack?.bind(nextConfig);

  return {
    ...nextConfig,
    webpack: (config: Configuration, context: NextWebpackBuildContext) => {
      const resolvedConfig = originalWebpack
        ? originalWebpack(config, context) || config
        : config;
      resolvedConfig.plugins = resolvedConfig.plugins || [];

      const target = resolveBuildTarget(context);
      const shouldAnalyze =
        (target === "client" && analyzeClient) ||
        (target === "server" && analyzeServer) ||
        (target === "edge" && analyzeEdge) ||
        (target === "middleware" && analyzeMiddleware);

      if (!shouldAnalyze) {
        return resolvedConfig;
      }

      const resolvedDistDir =
        distDir ?? (context.config?.distDir as string | undefined) ?? ".next";

      const plugin = nextJsBundleAnalysisPlugin(
        {
          ...pluginOptions,
          buildTarget: target,
          runtime:
            pluginOptions.runtime ??
            (target === "edge" || target === "middleware" ? "edge" : "nodejs"),
          buildOutputDir:
            pluginOptions.buildOutputDir ??
            resolvedConfig.output?.path ??
            resolve(context.dir, resolvedDistDir),
          distDir: resolvedDistDir,
        },
        pluginConfig,
      );

      resolvedConfig.plugins.push(plugin);
      return resolvedConfig;
    },
  };
}

/**
 * Heuristic to determine the Next.js build target from build context
 */
function resolveBuildTarget(
  context: NextWebpackBuildContext,
): NextJsBuildTarget {
  if (context.isServer) {
    if (context.nextRuntime === "edge") {
      return "edge";
    }
    const middleware = Boolean(
      context.middleware || context.page === "_middleware",
    );
    if (middleware) {
      return "middleware";
    }
    return "server";
  }

  if (context.nextRuntime === "edge") {
    return "middleware";
  }

  return "client";
}
