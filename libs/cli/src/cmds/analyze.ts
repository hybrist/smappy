/**
 * Analyze command implementation
 * Analyzes a JavaScript/TypeScript project to extract bundle information
 */

import { existsSync, statSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  detectBundlerAndFramework,
  type DetectionResult,
} from "../detection/index.js";
import {
  generateTempConfig,
  isBundlerSupported,
  type TempConfigResult,
} from "../config/index.js";
import { runBuild } from "../build/index.js";

export interface AnalyzeOptions {
  projectPath?: string;
  bundler?: string;
  framework?: string;
  verbose?: boolean;
  /** Skip the build execution (for testing or dry-run) */
  skipBuild?: boolean;
  /** Keep temporary files for debugging */
  keepTemp?: boolean;
}

/**
 * Parse bundler string to DetectionResult bundler type
 */
function parseBundler(bundler?: string): DetectionResult["bundler"] {
  if (!bundler) return null;

  const validBundlers: DetectionResult["bundler"][] = [
    "vite",
    "webpack",
    "rollup",
    "esbuild",
    "parcel",
    "nextjs",
    "angular",
  ];

  return validBundlers.includes(bundler as DetectionResult["bundler"])
    ? (bundler as DetectionResult["bundler"])
    : null;
}

/**
 * Parse framework string to DetectionResult framework type
 */
function parseFramework(framework?: string): DetectionResult["framework"] {
  if (!framework) return null;

  const validFrameworks: DetectionResult["framework"][] = [
    "react",
    "vue",
    "svelte",
    "angular",
    "sveltekit",
    "nextjs",
    "nuxt",
  ];

  return validFrameworks.includes(framework as DetectionResult["framework"])
    ? (framework as DetectionResult["framework"])
    : null;
}

/**
 * Get project name from package.json
 */
function getProjectName(projectPath: string): string {
  const packageJsonPath = resolve(projectPath, "package.json");
  if (!existsSync(packageJsonPath)) {
    return "unknown";
  }

  try {
    const packageJson = JSON.parse(
      readFileSync(packageJsonPath, "utf-8"),
    ) as Record<string, unknown>;
    return (packageJson.name as string) || "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Check if project uses TypeScript
 */
function hasTypeScript(projectPath: string): boolean {
  const tsConfigPath = resolve(projectPath, "tsconfig.json");
  if (existsSync(tsConfigPath)) {
    return true;
  }

  const packageJsonPath = resolve(projectPath, "package.json");
  if (existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(
        readFileSync(packageJsonPath, "utf-8"),
      ) as Record<string, unknown>;
      const deps = {
        ...((packageJson.dependencies as Record<string, string>) || {}),
        ...((packageJson.devDependencies as Record<string, string>) || {}),
      };
      return !!deps.typescript || !!deps["@types/node"];
    } catch {
      // Ignore errors
    }
  }

  return false;
}

/**
 * Run bundle analysis with temporary config
 */
async function runBundleAnalysis(
  projectPath: string,
  projectName: string,
  detection: DetectionResult,
  options: Omit<AnalyzeOptions, "projectPath">,
): Promise<void> {
  const { bundler } = detection;
  const { verbose, skipBuild, keepTemp } = options;

  // Check if bundler is supported for temp config generation
  if (!isBundlerSupported(bundler)) {
    console.warn(
      `\n⚠️  Bundler '${bundler}' is not yet supported for automatic analysis.`,
    );
    console.log(
      "Supported bundlers: vite, webpack, nextjs, rollup",
    );
    return;
  }

  console.log("\nGenerating temporary build configuration...");

  let tempConfig: TempConfigResult | null = null;

  try {
    // Generate temporary config
    tempConfig = await generateTempConfig({
      projectPath,
      projectName,
      bundler,
      debug: verbose,
      keepTemp: keepTemp || false,
    });

    if (verbose) {
      console.log(`  Config path: ${tempConfig.configPath}`);
      console.log(`  Temp directory: ${tempConfig.tempDir}`);
    }

    // Skip build if requested (for testing or dry-run)
    if (skipBuild) {
      console.log("\n✅ Configuration generated successfully!");
      console.log(
        `\nSkipping build execution (skipBuild option enabled).`,
      );
      console.log(`Temporary config: ${tempConfig.configPath}`);
      return;
    }

    console.log("\nRunning build with analysis plugin...");

    // Run the build
    const buildResult = await runBuild({
      projectPath,
      configPath: tempConfig.configPath,
      bundler,
      debug: verbose,
    });

    if (buildResult.success) {
      console.log("\n✅ Build and analysis complete!");
      console.log(
        `\nBundle data has been extracted and is ready for analysis.`,
      );
    } else {
      console.error("\n❌ Build failed!");
      if (buildResult.error) {
        console.error(`  Error: ${buildResult.error}`);
      }
      if (!verbose && buildResult.stderr) {
        console.error("\nBuild errors:");
        console.error(buildResult.stderr);
      }
      if (!verbose && buildResult.stdout) {
        console.log("\nBuild output:");
        console.log(buildResult.stdout);
      }
    }
  } catch (error) {
    console.error("\n❌ Failed to run bundle analysis:");
    console.error(
      error instanceof Error ? error.message : String(error),
    );
    if (verbose && error instanceof Error && error.stack) {
      console.error("\nStack trace:");
      console.error(error.stack);
    }
  } finally {
    // Always cleanup temporary files
    if (tempConfig) {
      try {
        await tempConfig.cleanup();
      } catch (cleanupError) {
        if (verbose) {
          console.warn(
            "Warning: Failed to cleanup temporary files:",
            cleanupError,
          );
        }
      }
    }
  }
}

/**
 * Main analyze command handler
 * Compatible with Commander.js interface from PR #145
 */
export async function analyzeCommand(
  projectPath: string = process.cwd(),
  options: Omit<AnalyzeOptions, "projectPath"> = {},
): Promise<void> {
  // Resolve and validate project path
  const resolvedPath = resolve(projectPath);

  if (!existsSync(resolvedPath)) {
    throw new Error(`Project path does not exist: ${resolvedPath}`);
  }

  if (!statSync(resolvedPath).isDirectory()) {
    throw new Error(`Project path is not a directory: ${resolvedPath}`);
  }

  if (options.verbose) {
    console.log(`Analyzing project at: ${resolvedPath}`);
  }

  // Detect bundler and framework using comprehensive detection system
  console.log("Detecting project configuration...");
  let detection = await detectBundlerAndFramework(resolvedPath);

  // Override with manual flags if provided
  if (options.bundler || options.framework) {
    detection = {
      ...detection,
      bundler: options.bundler
        ? (parseBundler(options.bundler) ?? detection.bundler)
        : detection.bundler,
      framework: options.framework
        ? (parseFramework(options.framework) ?? detection.framework)
        : detection.framework,
      confidence:
        options.bundler || options.framework ? "high" : detection.confidence,
      detectedVia: {
        bundler: options.bundler
          ? [`manual override: ${options.bundler}`]
          : detection.detectedVia.bundler,
        framework: options.framework
          ? [`manual override: ${options.framework}`]
          : detection.detectedVia.framework,
      },
    };
  }

  // Get additional project information
  const projectName = getProjectName(resolvedPath);
  const usesTypeScript = hasTypeScript(resolvedPath);

  if (options.verbose) {
    console.log(`  Bundler: ${detection.bundler ?? "Unknown"}`);
    if (detection.detectedVia.bundler.length > 0) {
      console.log(
        `    Detected via: ${detection.detectedVia.bundler.join(", ")}`,
      );
    }
    console.log(`  Framework: ${detection.framework ?? "Unknown"}`);
    if (detection.detectedVia.framework.length > 0) {
      console.log(
        `    Detected via: ${detection.detectedVia.framework.join(", ")}`,
      );
    }
    console.log(`  Confidence: ${detection.confidence}`);
    console.log(`  TypeScript: ${usesTypeScript ? "Yes" : "No"}`);
    console.log(`  Project name: ${projectName}`);
  } else {
    // Non-verbose output (matching PR #145 style)
    console.log(`  Bundler: ${detection.bundler ?? "Unknown"}`);
    console.log(`  Framework: ${detection.framework ?? "Unknown"}`);
    console.log(`  TypeScript: ${usesTypeScript ? "Yes" : "No"}`);
    console.log(`  Project name: ${projectName}`);
  }

  // Validate that we detected a bundler
  if (!detection.bundler) {
    console.error(
      "⚠️  Could not detect bundler. Make sure you have a valid project configuration.",
    );
    console.error("Supported bundlers: webpack, vite, rollup, nextjs, angular");
  }

  // Integrate with plugin system to extract bundle information
  if (detection.bundler) {
    await runBundleAnalysis(resolvedPath, projectName, detection, options);
  } else {
    console.log("\n✅ Project analysis complete!");
    console.log(
      "\nNote: Cannot run bundle analysis without detected bundler.",
    );
    console.log(
      `Detected ${detection.bundler ?? "unknown"} bundler for ${detection.framework ?? "unknown"} project.`,
    );
  }
}
