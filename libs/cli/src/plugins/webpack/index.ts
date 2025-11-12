/**
 * Webpack plugin for bundle analysis
 * Main entry point for webpack plugin exports
 */

export {
  WebpackBundleAnalysisPlugin,
  webpackBundleAnalysisPlugin,
} from "./plugin.js";
export type { WebpackPluginOptions } from "./plugin.js";
export { WebpackAdapter } from "./adapter.js";

// Default export
export { webpackBundleAnalysisPlugin as default } from "./plugin.js";
