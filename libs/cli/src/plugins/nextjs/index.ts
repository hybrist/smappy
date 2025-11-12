/**
 * Next.js bundle analysis plugin exports
 */

export {
  NextJsBundleAnalysisPlugin,
  nextJsBundleAnalysisPlugin,
  withNextBundleAnalysis,
} from "./plugin.js";
export type {
  NextJsPluginOptions,
  WithNextBundleAnalysisOptions,
  NextConfig,
  NextWebpackBuildContext,
} from "./plugin.js";

export { NextJsAdapter, sanitizeModuleIdentifier } from "./adapter.js";
export type {
  NextJsAdapterOptions,
  NextJsBuildTarget,
  NextJsRuntime,
} from "./adapter.js";
