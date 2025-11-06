/**
 * Plugin base types and utilities
 * Main entry point for bundler plugin development
 */

// Re-export types
export type {
  BundlerPluginOptions,
  PluginConfig,
  PluginExtractionResult,
  BundlerPlugin,
  BundlerModule,
  BundlerChunk,
  BundlerBundle,
} from './types.js';

export { isBundlerPlugin, isBundlerModule, isBundlerChunk } from './types.js';

// Re-export utilities
export {
  extractSourceMap,
  extractSourceMapFromPath,
  detectFileType,
  isModuleFile,
  isSourceFile,
  normalizePath,
  resolveModulePath,
  calculateSize,
  getSize,
  readFileContent,
  readFileContentSafe,
  shouldExcludeFile,
  shouldIncludeFile,
} from './utils.js';

// Re-export adapters
export { BundlerAdapter, AdapterRegistry, createDefaultAdapter } from './adapters.js';
export type { AdapterFactory } from './adapters.js';

// Re-export Angular plugin
export { AngularAdapter, angularBundleAnalysisBuilder } from './angular/index.js';
export type { AngularBuilderOptions } from './angular/index.js';
