/**
 * Config generation module
 * Generates temporary bundler configs to inject Smappy analysis plugins
 */

export type {
  ConfigGenerator,
  TempConfigOptions,
  TempConfigResult,
} from "./types.ts";
export { ViteConfigGenerator } from "./vite.ts";
export { WebpackConfigGenerator } from "./webpack.ts";
export { NextjsConfigGenerator } from "./nextjs.ts";
export { RollupConfigGenerator } from "./rollup.ts";
export {
  getConfigGenerator,
  generateTempConfig,
  isBundlerSupported,
} from "./factory.ts";
export {
  createTempDir,
  createCleanup,
  writeTempConfig,
  registerCleanupHandlers,
  createTempConfigResult,
} from "./utils.ts";
