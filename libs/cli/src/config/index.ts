/**
 * Config generation module
 * Generates temporary bundler configs to inject Smappy analysis plugins
 */

export type {
  ConfigGenerator,
  TempConfigOptions,
  TempConfigResult,
} from "./types.js";
export { ViteConfigGenerator } from "./vite.js";
export { WebpackConfigGenerator } from "./webpack.js";
export { NextjsConfigGenerator } from "./nextjs.js";
export { RollupConfigGenerator } from "./rollup.js";
export {
  getConfigGenerator,
  generateTempConfig,
  isBundlerSupported,
} from "./factory.js";
export {
  createTempDir,
  createCleanup,
  writeTempConfig,
  registerCleanupHandlers,
  createTempConfigResult,
} from "./utils.js";
