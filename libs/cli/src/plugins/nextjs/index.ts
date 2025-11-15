/**
 * Next.js bundle analysis plugin exports
 */

export {
  NextJsBundleAnalysisPlugin,
  nextJsBundleAnalysisPlugin,
  withNextBundleAnalysis,
} from "./plugin.ts";
export type {
  NextJsPluginOptions,
  WithNextBundleAnalysisOptions,
  NextConfig,
  NextWebpackBuildContext,
} from "./plugin.ts";

export { NextJsAdapter, sanitizeModuleIdentifier } from "./adapter.ts";
export type {
  NextJsAdapterOptions,
  NextJsBuildTarget,
  NextJsRuntime,
} from "./adapter.ts";
