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
} from "./types.ts";

export { isBundlerPlugin, isBundlerModule, isBundlerChunk } from "./types.ts";

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
} from "./utils.ts";

// Re-export adapters
export {
  BundlerAdapter,
  AdapterRegistry,
  createDefaultAdapter,
} from "./adapters.ts";
export type { AdapterFactory } from "./adapters.ts";

// Re-export Angular plugin
export {
  AngularAdapter,
  angularBundleAnalysisBuilder,
} from "./angular/index.ts";
export type { AngularBuilderOptions } from "./angular/index.ts";

// Re-export Next.js plugin
export {
  NextJsBundleAnalysisPlugin,
  nextJsBundleAnalysisPlugin,
  withNextBundleAnalysis,
} from "./nextjs/index.ts";
export type {
  NextJsPluginOptions,
  WithNextBundleAnalysisOptions,
  NextConfig as NextBundleAnalysisConfig,
  NextWebpackBuildContext,
  NextJsBuildTarget,
  NextJsRuntime,
} from "./nextjs/index.ts";
export { NextJsAdapter } from "./nextjs/index.ts";
