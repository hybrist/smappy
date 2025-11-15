/**
 * Config generator factory
 * Creates appropriate config generator based on detected bundler
 */

import type {
  ConfigGenerator,
  TempConfigOptions,
  TempConfigResult,
} from "./types.ts";
import type { DetectionResult } from "../detection/index.ts";
import { ViteConfigGenerator } from "./vite.ts";
import { WebpackConfigGenerator } from "./webpack.ts";
import { NextjsConfigGenerator } from "./nextjs.ts";
import { RollupConfigGenerator } from "./rollup.ts";

/**
 * Registry of config generators
 */
const generators: ConfigGenerator[] = [
  new ViteConfigGenerator(),
  new WebpackConfigGenerator(),
  new NextjsConfigGenerator(),
  new RollupConfigGenerator(),
];

/**
 * Get config generator for a specific bundler
 */
export function getConfigGenerator(
  bundler: DetectionResult["bundler"],
): ConfigGenerator | null {
  if (!bundler) {
    return null;
  }

  const generator = generators.find((g) => g.supports(bundler));
  return generator || null;
}

/**
 * Generate a temporary config for the detected bundler
 */
export async function generateTempConfig(
  options: TempConfigOptions,
): Promise<TempConfigResult> {
  const generator = getConfigGenerator(options.bundler);

  if (!generator) {
    throw new Error(
      `No config generator available for bundler: ${options.bundler}. ` +
        `Supported bundlers: vite, webpack, nextjs, rollup`,
    );
  }

  return generator.generate(options);
}

/**
 * Check if a bundler is supported for temp config generation
 */
export function isBundlerSupported(
  bundler: DetectionResult["bundler"],
): boolean {
  return generators.some((g) => g.supports(bundler));
}
