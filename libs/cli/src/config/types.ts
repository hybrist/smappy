/**
 * Types for temporary config generation
 */

import type { DetectionResult } from "../detection/index.ts";

/**
 * Options for generating temporary configs
 */
export interface TempConfigOptions {
  /** Project directory path */
  projectPath: string;
  /** Project name from package.json */
  projectName: string;
  /** Detected bundler information */
  bundler: DetectionResult["bundler"];
  /** Output directory for analysis results */
  outputDir?: string;
  /** Whether to keep temporary files for debugging */
  keepTemp?: boolean;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Result of temporary config generation
 */
export interface TempConfigResult {
  /** Path to the generated temporary config file */
  configPath: string;
  /** Temporary directory containing the config */
  tempDir: string;
  /** Cleanup function to remove temporary files */
  cleanup: () => Promise<void>;
}

/**
 * Base interface for config generators
 */
export interface ConfigGenerator {
  /**
   * Generate a temporary config file
   */
  generate(options: TempConfigOptions): Promise<TempConfigResult>;

  /**
   * Check if this generator supports the given bundler
   */
  supports(bundler: DetectionResult["bundler"]): boolean;
}
