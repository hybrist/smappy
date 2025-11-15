/**
 * Bundler detection logic
 * Detects bundlers based on config files and package.json dependencies
 */

import { existsSync } from "node:fs";
import { join } from "node:path";

export type BundlerType =
  | "vite"
  | "webpack"
  | "rollup"
  | "esbuild"
  | "parcel"
  | "nextjs"
  | "angular"
  | null;

export interface BundlerDetection {
  bundler: BundlerType;
  confidence: "high" | "medium" | "low";
  detectedVia: string[];
}

/**
 * Check if a config file exists in the project directory
 */
function hasConfigFile(
  projectPath: string,
  configFiles: string[],
): string | null {
  for (const configFile of configFiles) {
    const configPath = join(projectPath, configFile);
    if (existsSync(configPath)) {
      return configFile;
    }
  }
  return null;
}

/**
 * Check if a dependency exists in package.json
 */
function hasDependency(
  packageJson: Record<string, unknown>,
  dependencyNames: string[],
  field: "dependencies" | "devDependencies" | "all" = "all",
): string | null {
  const deps =
    field === "all"
      ? {
          ...((packageJson.dependencies as Record<string, string>) || {}),
          ...((packageJson.devDependencies as Record<string, string>) || {}),
        }
      : (packageJson[field] as Record<string, string>) || {};

  for (const depName of dependencyNames) {
    if (depName in deps) {
      return depName;
    }
  }
  return null;
}

/**
 * Detect bundler based on config files and dependencies
 */
export function detectBundler(
  projectPath: string,
  packageJson: Record<string, unknown>,
): BundlerDetection {
  const detectedVia: string[] = [];

  // Check for Next.js (which uses Webpack/Turbopack internally)
  const nextConfigFile = hasConfigFile(projectPath, [
    "next.config.js",
    "next.config.mjs",
    "next.config.ts",
  ]);
  if (nextConfigFile) {
    detectedVia.push(nextConfigFile);
    return {
      bundler: "nextjs",
      confidence: "high",
      detectedVia,
    };
  }
  if (hasDependency(packageJson, ["next"])) {
    detectedVia.push("next in dependencies");
    return {
      bundler: "nextjs",
      confidence: "high",
      detectedVia,
    };
  }

  // Check for Angular (which uses its own builder)
  const angularConfigFile = hasConfigFile(projectPath, ["angular.json"]);
  if (angularConfigFile) {
    detectedVia.push(angularConfigFile);
    return {
      bundler: "angular",
      confidence: "high",
      detectedVia,
    };
  }
  if (hasDependency(packageJson, ["@angular/core"])) {
    detectedVia.push("@angular/core in dependencies");
    return {
      bundler: "angular",
      confidence: "high",
      detectedVia,
    };
  }

  // Check for Vite
  const viteConfigFile = hasConfigFile(projectPath, [
    "vite.config.js",
    "vite.config.ts",
    "vite.config.mjs",
  ]);
  if (viteConfigFile) {
    detectedVia.push(viteConfigFile);
    const depCheck = hasDependency(packageJson, ["vite"]);
    if (depCheck) {
      detectedVia.push(`${depCheck} in dependencies`);
    }
    return {
      bundler: "vite",
      confidence: depCheck ? "high" : "medium",
      detectedVia,
    };
  }
  if (hasDependency(packageJson, ["vite"])) {
    detectedVia.push("vite in dependencies");
    return {
      bundler: "vite",
      confidence: "high",
      detectedVia,
    };
  }

  // Check for Webpack
  const webpackConfigFile = hasConfigFile(projectPath, [
    "webpack.config.js",
    "webpack.config.ts",
  ]);
  if (webpackConfigFile) {
    detectedVia.push(webpackConfigFile);
    const depCheck = hasDependency(packageJson, ["webpack", "webpack-cli"]);
    if (depCheck) {
      detectedVia.push(`${depCheck} in dependencies`);
    }
    return {
      bundler: "webpack",
      confidence: depCheck ? "high" : "medium",
      detectedVia,
    };
  }
  if (hasDependency(packageJson, ["webpack", "webpack-cli"])) {
    detectedVia.push("webpack/webpack-cli in dependencies");
    return {
      bundler: "webpack",
      confidence: "high",
      detectedVia,
    };
  }

  // Check for Rollup (standalone)
  if (hasDependency(packageJson, ["rollup"])) {
    detectedVia.push("rollup in dependencies");
    return {
      bundler: "rollup",
      confidence: "medium", // Could be a transitive dependency
      detectedVia,
    };
  }

  // Check for esbuild
  if (hasDependency(packageJson, ["esbuild"])) {
    detectedVia.push("esbuild in dependencies");
    return {
      bundler: "esbuild",
      confidence: "medium",
      detectedVia,
    };
  }

  // Check for Parcel
  if (hasDependency(packageJson, ["parcel"])) {
    detectedVia.push("parcel in dependencies");
    return {
      bundler: "parcel",
      confidence: "medium",
      detectedVia,
    };
  }

  return {
    bundler: null,
    confidence: "low",
    detectedVia,
  };
}
