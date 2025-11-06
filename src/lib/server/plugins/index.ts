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
export {
  BundlerAdapter,
  AdapterFactory,
  AdapterRegistry,
  createDefaultAdapter,
} from './adapters.js';
