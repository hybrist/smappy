/**
 * Utilities for detecting bundler and framework from project files
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Check if a config file exists with common extensions
 */
function configFileExists(projectPath: string, baseName: string): boolean {
  const extensions = [".js", ".ts", ".mjs", ".cjs"];
  return extensions.some((ext) =>
    existsSync(join(projectPath, `${baseName}${ext}`)),
  );
}

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
    if (configFileExists(projectPath, "next.config")) {
      return "nextjs";
    }

    if (existsSync(join(projectPath, "angular.json"))) {
      return "angular";
    }

    if (configFileExists(projectPath, "vite.config")) {
      return "vite";
    }

    if (configFileExists(projectPath, "webpack.config")) {
      return "webpack";
    }

    if (configFileExists(projectPath, "rollup.config")) {
      return "rollup";
    }

    // Check package.json dependencies
    if (deps.next) {
      return "nextjs";
    }

    const viteDeps = [
      "vite",
      "@vitejs/plugin-react",
      "@vitejs/plugin-vue",
      "@sveltejs/vite-plugin-svelte",
    ];
    if (viteDeps.some((dep) => deps[dep])) {
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
