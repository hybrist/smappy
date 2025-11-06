/**
 * Vite/Rollup adapter for bundle analysis
 * Extracts bundle data from Vite's Rollup output and converts it to normalized ingestion input
 */

import type {
  PluginExtractionResult,
  BundlerModule,
  BundlerChunk,
  BundlerBundle,
} from '../types.js';
import { BundlerAdapter } from '../adapters.js';
import { normalizePath, extractSourceMap, readFileContent } from '../utils.js';
import type { OutputBundle, OutputChunk } from 'rollup';

// ============================================================================
// Rollup Output Types
// ============================================================================

/**
 * Rollup bundle output structure
 */
interface RollupBundleOutput {
  bundle: OutputBundle;
  outputDir: string;
  isSSR?: boolean;
}

// ============================================================================
// Vite Adapter Implementation
// ============================================================================

/**
 * Adapter for extracting bundle data from Vite/Rollup builds
 */
export class ViteAdapter extends BundlerAdapter {
  /**
   * Extract normalized data from Rollup bundle output
   *
   * @param bundlerOutput - Rollup OutputBundle from generateBundle hook
   * @returns Normalized extraction result
   */
  extract(bundlerOutput: unknown): PluginExtractionResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!this.isRollupBundle(bundlerOutput)) {
      errors.push('Invalid Rollup bundle output format');
      return this.createEmptyResult(errors, warnings);
    }

    const rollupOutput = bundlerOutput as RollupBundleOutput;
    const { bundle, outputDir } = rollupOutput;

    try {
      // Convert Rollup bundle to our normalized types
      const bundlerModules = this.extractModules(bundle, outputDir, errors);
      const bundlerChunks = this.extractChunks(bundle, errors);
      const bundlerBundles = this.extractBundles(bundle, outputDir, errors);

      // Use base class conversion methods
      const modules = this.convertModules(bundlerModules, errors);
      const chunks = this.convertChunks(bundlerChunks, errors);
      const bundles = this.convertBundles(bundlerBundles, errors);

      // Create ingestion options
      const options = this.createIngestionOptions('vite');

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
   * Extract modules from Rollup bundle
   */
  private extractModules(
    bundle: OutputBundle,
    outputDir: string,
    _errors: string[],
  ): BundlerModule[] {
    const modules: BundlerModule[] = [];

    for (const [id, chunkOrAsset] of Object.entries(bundle)) {
      // Only process chunks (not assets)
      if (chunkOrAsset?.type !== 'chunk') {
        continue;
      }

      const chunk = chunkOrAsset as OutputChunk;

      // Extract module information from chunk
      if (chunk.modules) {
        for (const [moduleId, moduleInfo] of Object.entries(chunk.modules)) {
          // Type guard for module info - Rollup modules have renderedLength
          const info = moduleInfo as { renderedLength?: number };
          
          // Skip virtual modules and node_modules unless configured
          if (
            moduleId.startsWith('\0') ||
            (!this.options.analyzeThirdParty && moduleId.includes('node_modules'))
          ) {
            continue;
          }

          // Get module dependencies
          const dependencies: string[] = [];
          if (chunk.imports) {
            dependencies.push(...chunk.imports);
          }
          if (chunk.dynamicImports) {
            dependencies.push(...chunk.dynamicImports);
          }

          // Try to read source content if available
          let source: string | undefined;
          try {
            // Module path might be in moduleInfo
            const modulePath = this.resolveModulePath(moduleId, outputDir);
            source = readFileContent(modulePath);
          } catch {
            // Source not available, that's okay
          }

          modules.push({
            identifier: moduleId,
            name: moduleId,
            size: info.renderedLength,
            source,
            dependencies: [...new Set(dependencies)], // Deduplicate
            reasons: chunk.isEntry
              ? [{ type: 'entry', module: moduleId }]
              : [{ type: 'import', module: moduleId }],
          });
        }
      }

      // Also include the chunk itself as a module if it's an entry
      if (chunk.isEntry) {
        modules.push({
          identifier: chunk.facadeModuleId || id,
          name: chunk.name || id,
          size: chunk.code?.length || 0,
          dependencies: [...(chunk.imports || []), ...(chunk.dynamicImports || [])],
          reasons: [{ type: 'entry', module: chunk.facadeModuleId || id }],
        });
      }
    }

    return modules;
  }

  /**
   * Extract chunks from Rollup bundle
   */
  private extractChunks(bundle: OutputBundle, _errors: string[]): BundlerChunk[] {
    const chunks: BundlerChunk[] = [];

    for (const [id, chunkOrAsset] of Object.entries(bundle)) {
      if (chunkOrAsset?.type !== 'chunk') {
        continue;
      }

      const chunk = chunkOrAsset as OutputChunk;

      // Get module IDs from this chunk
      const moduleIds: string[] = [];
      if (chunk.modules) {
        moduleIds.push(...Object.keys(chunk.modules));
      }
      if (chunk.facadeModuleId) {
        moduleIds.push(chunk.facadeModuleId);
      }

      chunks.push({
        name: chunk.name || id,
        size: chunk.code?.length || 0,
        modules: [...new Set(moduleIds)], // Deduplicate
        isEntry: chunk.isEntry || false,
        isAsync: chunk.isDynamicEntry || false,
        files: chunk.fileName ? [chunk.fileName] : [],
      });
    }

    return chunks;
  }

  /**
   * Extract bundles (output files) from Rollup bundle
   */
  private extractBundles(
    bundle: OutputBundle,
    outputDir: string,
    _errors: string[],
  ): BundlerBundle[] {
    const bundles: BundlerBundle[] = [];

    for (const [, chunkOrAsset] of Object.entries(bundle)) {
      // Process chunks (JS files)
      if (chunkOrAsset?.type === 'chunk') {
        const chunk = chunkOrAsset as OutputChunk;
        const fileName = chunk.fileName;

        // Read bundle content
        let content: string | undefined;
        let sourceMap: string | undefined;

        if (chunk.code) {
          content = chunk.code;

          // Extract source map if available
          if (this.options.extractSourceMaps !== false) {
            // Check for inline source map
            if (chunk.map) {
              sourceMap = typeof chunk.map === 'string' ? chunk.map : JSON.stringify(chunk.map);
            } else if (fileName && content) {
              // Try to extract from content
              const bundlePath = this.resolveBundlePath(fileName, outputDir);
              sourceMap = extractSourceMap(content, bundlePath, outputDir);
            }
          }
        }

        bundles.push({
          fileName,
          content,
          size: content?.length || 0,
          sourceMap,
          chunks: chunk.name ? [chunk.name] : [],
        });
      }
      // Assets (CSS, images, etc.) are not included as bundles
      // They should be handled separately if needed
    }

    return bundles;
  }

  /**
   * Resolve module path from module ID
   */
  private resolveModulePath(moduleId: string, outputDir: string): string {
    // Remove virtual module prefix
    if (moduleId.startsWith('\0')) {
      moduleId = moduleId.slice(1);
    }

    // If it's already an absolute path, return it normalized
    if (moduleId.startsWith('/') || moduleId.match(/^[A-Z]:/)) {
      return normalizePath(moduleId, this.baseDir);
    }

    // Try to resolve relative to output directory or base directory
    const base = outputDir || this.baseDir;
    return normalizePath(moduleId, base);
  }

  /**
   * Resolve bundle file path
   */
  private resolveBundlePath(fileName: string, outputDir: string): string {
    if (fileName.startsWith('/')) {
      return fileName;
    }
    return normalizePath(fileName, outputDir || this.baseDir);
  }

  /**
   * Type guard for Rollup bundle output
   */
  private isRollupBundle(output: unknown): output is RollupBundleOutput {
    if (!output || typeof output !== 'object') {
      return false;
    }

    const obj = output as Record<string, unknown>;
    return 'bundle' in obj && typeof obj.bundle === 'object' && obj.bundle !== null;
  }

  /**
   * Create empty result with errors
   */
  private createEmptyResult(errors: string[], warnings: string[]): PluginExtractionResult {
    return {
      bundles: [],
      modules: [],
      chunks: [],
      options: this.createIngestionOptions('vite'),
      warnings,
      errors,
    };
  }
}
