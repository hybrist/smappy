/**
 * Utilities for detecting bundler and framework from project files
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface ProjectInfo {
  bundler: "webpack" | "vite" | "rollup" | "nextjs" | "angular" | "unknown";
  framework:
    | "react"
    | "vue"
    | "svelte"
    | "angular"
    | "nextjs"
    | "remix"
    | "unknown";
  hasTypeScript: boolean;
  projectName: string;
}

/**
 * Detect bundler from package.json dependencies and config files
 */
export function detectBundler(projectPath: string): ProjectInfo["bundler"] {
  const packageJsonPath = join(projectPath, "package.json");

  if (!existsSync(packageJsonPath)) {
    return "unknown";
  }

  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    // Check for bundler-specific config files first
    if (existsSync(join(projectPath, "next.config.js")) ||
        existsSync(join(projectPath, "next.config.ts")) ||
        existsSync(join(projectPath, "next.config.mjs")) ||
        existsSync(join(projectPath, "next.config.cjs"))) {
      return "nextjs";
    }

    if (existsSync(join(projectPath, "angular.json"))) {
      return "angular";
    }

    if (existsSync(join(projectPath, "vite.config.js")) ||
        existsSync(join(projectPath, "vite.config.ts")) ||
        existsSync(join(projectPath, "vite.config.mjs")) ||
        existsSync(join(projectPath, "vite.config.cjs"))) {
      return "vite";
    }

    if (existsSync(join(projectPath, "webpack.config.js")) ||
        existsSync(join(projectPath, "webpack.config.ts")) ||
        existsSync(join(projectPath, "webpack.config.mjs")) ||
        existsSync(join(projectPath, "webpack.config.cjs"))) {
      return "webpack";
    }

    // Check package.json dependencies
    if (deps.next) {
      return "nextjs";
    }

    if (deps.vite || deps["@vitejs/plugin-react"] || deps["@vitejs/plugin-vue"] || deps["@sveltejs/vite-plugin-svelte"]) {
      return "vite";
    }

    if (deps.webpack || deps["@angular-devkit/build-angular"]) {
      return deps["@angular-devkit/build-angular"] ? "angular" : "webpack";
    }

    if (deps.rollup || deps["@rollup/plugin-node-resolve"]) {
      return "rollup";
    }

    return "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Detect framework from package.json dependencies
 */
export function detectFramework(projectPath: string): ProjectInfo["framework"] {
  const packageJsonPath = join(projectPath, "package.json");

  if (!existsSync(packageJsonPath)) {
    return "unknown";
  }

  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    if (deps.next) {
      return "nextjs";
    }

    if (deps.react || deps["react-dom"]) {
      return "react";
    }

    if (deps.vue || deps["vue-router"]) {
      return "vue";
    }

    if (deps.svelte || deps["@sveltejs/kit"]) {
      return "svelte";
    }

    if (deps["@angular/core"] || deps["@angular/platform-browser"]) {
      return "angular";
    }

    if (deps["@remix-run/react"] || deps["@remix-run/node"]) {
      return "remix";
    }

    return "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Check if project uses TypeScript
 */
export function hasTypeScript(projectPath: string): boolean {
  const packageJsonPath = join(projectPath, "package.json");
  const tsConfigPath = join(projectPath, "tsconfig.json");

  if (existsSync(tsConfigPath)) {
    return true;
  }

  if (existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
      const deps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };
      return !!deps.typescript || !!deps["@types/node"];
    } catch {
      // Ignore errors
    }
  }

  return false;
}

/**
 * Get project name from package.json
 */
export function getProjectName(projectPath: string): string {
  const packageJsonPath = join(projectPath, "package.json");

  if (!existsSync(packageJsonPath)) {
    return "unknown";
  }

  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
    return packageJson.name || "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Detect project information (bundler, framework, etc.)
 */
export function detectProject(projectPath: string): ProjectInfo {
  return {
    bundler: detectBundler(projectPath),
    framework: detectFramework(projectPath),
    hasTypeScript: hasTypeScript(projectPath),
    projectName: getProjectName(projectPath),
  };
}

