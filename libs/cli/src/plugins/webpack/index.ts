/**
 * Webpack plugin for bundle analysis
 * Main entry point for webpack plugin exports
 */

export {
  WebpackBundleAnalysisPlugin,
  webpackBundleAnalysisPlugin,
} from "./plugin.ts";
export type { WebpackPluginOptions } from "./plugin.ts";
export { WebpackAdapter } from "./adapter.ts";

// Default export
export { webpackBundleAnalysisPlugin as default } from "./plugin.ts";
