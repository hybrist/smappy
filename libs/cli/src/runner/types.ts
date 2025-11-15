/**
 * Types for build execution
 */

import type { DetectionResult } from "../detection/index.ts";

/**
 * Options for running a build
 */
export interface BuildOptions {
  /** Project directory path */
  projectPath: string;
  /** Path to the config file to use */
  configPath: string;
  /** Detected bundler */
  bundler: DetectionResult["bundler"];
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Result of a build execution
 */
export interface BuildResult {
  /** Whether the build succeeded */
  success: boolean;
  /** Exit code from the build process */
  exitCode: number | null;
  /** Standard output from the build */
  stdout?: string;
  /** Standard error from the build */
  stderr?: string;
  /** Error message if build failed */
  error?: string;
}
