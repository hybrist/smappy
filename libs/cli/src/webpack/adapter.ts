/**
 * Webpack adapter for bundle analysis
 * Extracts bundle data from webpack stats JSON and converts it to normalized ingestion input
 */

import type { ModuleInput } from "@smappy/core";
import type {
  PluginExtractionResult,
  BundlerModule,
  BundlerChunk,
  BundlerBundle,
  BundlerPluginOptions,
} from "../plugins/types.ts";
import { BundlerAdapter } from "../plugins/adapters.ts";
import {
  normalizePath,
  extractSourceMap,
  readFileContent,
} from "../plugins/utils.ts";
import type { StatsCompilation } from "webpack";
import type { ProjectInfo } from "../runner/types.ts";

// ============================================================================
// Webpack Adapter Implementation
// ============================================================================

/**
 * Adapter for extracting bundle data from webpack builds
 */
export class WebpackAdapter extends BundlerAdapter {
  readonly #stats: StatsCompilation;

  constructor(
    project: ProjectInfo,
    stats: StatsCompilation,
    options?: Omit<BundlerPluginOptions, "projectName">,
  ) {
    super(
      project.path,
      {
        analyzeThirdParty: true,
        ...options,
        projectName: project.name,
      },
      {},
    );
    this.#stats = stats;
  }

  /**
   * Extract normalized data from webpack stats JSON
   *
   * @param bundlerOutput - Optional StatsCompilation to use instead of constructor stats
   * @returns Normalized extraction result
   */
  extract(): PluginExtractionResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Use provided stats or the one from constructor
    const statsJson = this.#stats;

    if (!statsJson) {
      errors.push("No webpack stats available");
      return this.createEmptyResult(errors, warnings);
    }

    try {
      // Convert webpack stats to our normalized types
      const bundlerModules = this.extractModules(statsJson);
      const bundlerChunks = this.extractChunks(statsJson);
      const bundlerBundles = this.extractBundles(statsJson);

      // Use base class conversion methods
      const modules = this.convertModules(bundlerModules, errors);
      const chunks = this.convertChunks(bundlerChunks, errors);
      const bundles = this.convertBundles(bundlerBundles, errors);

      // Create ingestion options
      const options = this.createIngestionOptions("webpack");

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
   * Extract modules from webpack stats JSON
   */
  private extractModules(statsJson: StatsCompilation): BundlerModule[] {
    const modules: BundlerModule[] = [];
    const moduleMap = new Map<string, BundlerModule>();

    // Process modules from stats
    if (statsJson.modules) {
      for (const module of statsJson.modules) {
        const moduleId = module.identifier || module.name || "";
        if (!moduleId) continue;

        // Skip node_modules unless configured
        if (
          !this.options.analyzeThirdParty &&
          moduleId.includes("node_modules")
        ) {
          continue;
        }

        // Try to read source content from file system
        let source: string | undefined;
        try {
          const modulePath = this.resolveModulePath(moduleId);
          source = readFileContent(modulePath);
        } catch {
          // Source not available, that's okay
          if (this.config?.debug) {
            console.debug(
              `[webpack-adapter] Failed to read source for moduleId: ${moduleId}`,
            );
          }
        }

        // Extract dependencies from reasons
        const dependencies: string[] = [];
        if (module.reasons) {
          for (const reason of module.reasons) {
            if (reason.moduleName) {
              dependencies.push(reason.moduleName);
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
            const moduleId = module.identifier || module.name || "";
            if (!moduleId || moduleMap.has(moduleId)) {
              continue; // Already processed
            }

            // Skip node_modules unless configured
            if (
              !this.options.analyzeThirdParty &&
              moduleId.includes("node_modules")
            ) {
              continue;
            }

            // Try to get source content
            let source: string | undefined;
            try {
              const modulePath = this.resolveModulePath(moduleId);
              source = readFileContent(modulePath);
            } catch {
              // Source not available
              if (this.config?.debug) {
                console.debug(
                  `[webpack-adapter] Failed to read source for moduleId: ${moduleId}`,
                );
              }
            }

            // Extract dependencies from reasons
            const dependencies: string[] = [];
            if (module.reasons) {
              for (const reason of module.reasons) {
                if (reason.moduleName) {
                  dependencies.push(reason.moduleName);
                }
              }
            }

            const bundlerModule: BundlerModule = {
              identifier: moduleId,
              name: module.name || moduleId,
              size: module.size,
              source,
              dependencies: [...new Set(dependencies)],
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
   * Extract chunks from webpack stats JSON
   */
  private extractChunks(statsJson: StatsCompilation): BundlerChunk[] {
    const chunks: BundlerChunk[] = [];

    if (!statsJson.chunks) {
      return chunks;
    }

    for (const chunk of statsJson.chunks) {
      const chunkName = chunk.names?.[0] || chunk.id?.toString() || "unknown";
      const moduleIds: string[] = [];

      // Collect module IDs from chunk
      if (chunk.modules) {
        for (const module of chunk.modules) {
          const moduleId = module.identifier || module.name || "";
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
        isAsync: !chunk.initial || false,
        files: chunk.files || [],
      });
    }

    return chunks;
  }

  /**
   * Extract bundles (output files) from webpack stats JSON
   */
  private extractBundles(statsJson: StatsCompilation): BundlerBundle[] {
    const bundles: BundlerBundle[] = [];

    const { outputPath } = statsJson;

    if (!statsJson.assets || !outputPath) {
      return bundles;
    }

    for (const asset of statsJson.assets) {
      const fileName = asset.name;
      if (!fileName) continue;

      // Only process JavaScript files
      if (
        !fileName.endsWith(".js") &&
        !fileName.endsWith(".mjs") &&
        !fileName.endsWith(".cjs")
      ) {
        continue;
      }

      // Read bundle content
      let content: string | undefined;
      let sourceMap: string | undefined;

      try {
        const bundlePath = this.resolveBundlePath(fileName, outputPath);
        content = readFileContent(bundlePath);

        // Extract source map if enabled
        if (this.options.extractSourceMaps !== false && content) {
          // Check for separate source map file
          const sourceMapPath = bundlePath + ".map";
          try {
            sourceMap = readFileContent(sourceMapPath);
          } catch {
            // Try to extract from content
            sourceMap = extractSourceMap(content, bundlePath, outputPath);
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
            const chunkName = chunk.names?.[0] || chunk.id?.toString() || "";
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
   * Sanitize module identifiers before conversion so we don't misclassify modules
   */
  protected override convertModules(
    bundlerModules: BundlerModule[],
    errors: string[],
  ): ModuleInput[] {
    const sanitizedModules = bundlerModules.map((module) => ({
      ...module,
      identifier: this.sanitizeModuleIdentifier(module.identifier),
    }));

    return super.convertModules(sanitizedModules, errors);
  }

  /**
   * Resolve module path from module identifier
   */
  private resolveModulePath(moduleId: string): string {
    const cleanId = this.sanitizeModuleIdentifier(moduleId) || moduleId;

    // If it's already an absolute path, return it normalized
    if (cleanId.startsWith("/") || cleanId.match(/^[A-Z]:/)) {
      return normalizePath(cleanId, this.#stats.outputPath);
    }

    // Try to resolve relative to output path or base directory
    return normalizePath(cleanId, this.#stats.outputPath);
  }

  /**
   * Strip webpack loader prefixes and query strings
   */
  private sanitizeModuleIdentifier(moduleId: string): string {
    let cleanId = moduleId.trim();

    if (cleanId.startsWith("multi ")) {
      cleanId = cleanId.replace(/^multi\s+/, "");
    }

    const lastBangIndex = cleanId.lastIndexOf("!");
    if (lastBangIndex !== -1) {
      cleanId = cleanId.slice(lastBangIndex + 1);
    }

    const queryIndex = cleanId.indexOf("?");
    if (queryIndex !== -1) {
      cleanId = cleanId.slice(0, queryIndex);
    }

    return cleanId;
  }

  /**
   * Resolve bundle file path
   */
  private resolveBundlePath(fileName: string, outputPath: string): string {
    if (fileName.startsWith("/")) {
      return fileName;
    }
    return normalizePath(fileName, outputPath);
  }

  /**
   * Create empty result with errors
   */
  private createEmptyResult(
    errors: string[],
    warnings: string[],
  ): PluginExtractionResult {
    return {
      bundles: [],
      modules: [],
      chunks: [],
      options: this.createIngestionOptions("webpack"),
      warnings,
      errors,
    };
  }
}
