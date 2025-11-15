/**
 * Main detection orchestrator
 * Combines bundler and framework detection
 */

import { existsSync, readFileSync } from "node:fs";
import { join, resolve, isAbsolute } from "node:path";
import { detectBundler, type BundlerDetection } from "./bundler.js";
import { detectFramework, type FrameworkDetection } from "./framework.js";

export interface DetectionResult {
  bundler: BundlerDetection["bundler"];
  framework: FrameworkDetection["framework"];
  confidence: "high" | "medium" | "low";
  detectedVia: {
    bundler: string[];
    framework: string[];
  };
}

/**
 * Read and parse package.json from project path
 */
function readPackageJson(projectPath: string): Record<string, unknown> {
  const packageJsonPath = join(projectPath, "package.json");
  if (!existsSync(packageJsonPath)) {
    throw new Error(`package.json not found at ${projectPath}`);
  }

  try {
    const content = readFileSync(packageJsonPath, "utf-8");
    return JSON.parse(content) as Record<string, unknown>;
  } catch (error) {
    throw new Error(
      `Failed to parse package.json: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Determine overall confidence based on bundler and framework detections
 */
function determineOverallConfidence(
  bundlerDetection: BundlerDetection,
  frameworkDetection: FrameworkDetection,
): "high" | "medium" | "low" {
  // If both are high confidence, overall is high
  if (
    bundlerDetection.confidence === "high" &&
    frameworkDetection.confidence === "high"
  ) {
    return "high";
  }

  // If both are low confidence, overall is low
  if (
    bundlerDetection.confidence === "low" &&
    frameworkDetection.confidence === "low"
  ) {
    return "low";
  }

  // Otherwise, take the higher of the two
  if (
    bundlerDetection.confidence === "high" ||
    frameworkDetection.confidence === "high"
  ) {
    return "medium";
  }

  return "low";
}

/**
 * Detect bundler and framework from project files
 *
 * @param projectPath - Path to the project directory (defaults to current directory)
 * @returns Detection result with bundler, framework, and confidence level
 */
export async function detectBundlerAndFramework(
  projectPath: string = process.cwd(),
): Promise<DetectionResult> {
  // Normalize project path - resolve relative to process.cwd() if not absolute
  const resolvedPath = isAbsolute(projectPath)
    ? projectPath
    : resolve(process.cwd(), projectPath);

  // Read package.json
  const packageJson = readPackageJson(resolvedPath);

  // Detect bundler and framework
  const bundlerDetection = detectBundler(resolvedPath, packageJson);
  const frameworkDetection = detectFramework(resolvedPath, packageJson);

  // Determine overall confidence
  const confidence = determineOverallConfidence(
    bundlerDetection,
    frameworkDetection,
  );

  return {
    bundler: bundlerDetection.bundler,
    framework: frameworkDetection.framework,
    confidence,
    detectedVia: {
      bundler: bundlerDetection.detectedVia,
      framework: frameworkDetection.detectedVia,
    },
  };
}

