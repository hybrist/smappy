/**
 * Framework detection logic
 * Detects frameworks based on config files and package.json dependencies
 */

import { existsSync } from "node:fs";
import { join } from "node:path";

export type FrameworkType =
  | "react"
  | "vue"
  | "svelte"
  | "angular"
  | "sveltekit"
  | "nextjs"
  | "nuxt"
  | null;

export interface FrameworkDetection {
  framework: FrameworkType;
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
 * Detect framework based on config files and dependencies
 */
export function detectFramework(
  projectPath: string,
  packageJson: Record<string, unknown>,
): FrameworkDetection {
  const detectedVia: string[] = [];

  // Check for Next.js (which includes React)
  const nextConfigFile = hasConfigFile(projectPath, [
    "next.config.js",
    "next.config.mjs",
    "next.config.ts",
  ]);
  if (nextConfigFile) {
    detectedVia.push(nextConfigFile);
    return {
      framework: "nextjs",
      confidence: "high",
      detectedVia,
    };
  }
  if (hasDependency(packageJson, ["next"])) {
    detectedVia.push("next in dependencies");
    return {
      framework: "nextjs",
      confidence: "high",
      detectedVia,
    };
  }

  // Check for SvelteKit (which includes Svelte)
  const svelteConfigFile = hasConfigFile(projectPath, [
    "svelte.config.js",
    "svelte.config.ts",
  ]);
  if (svelteConfigFile) {
    detectedVia.push(svelteConfigFile);
    const kitCheck = hasDependency(packageJson, ["@sveltejs/kit"]);
    if (kitCheck) {
      detectedVia.push(`${kitCheck} in dependencies`);
      return {
        framework: "sveltekit",
        confidence: "high",
        detectedVia,
      };
    }
    // If svelte.config exists but no kit, it might be standalone Svelte
    const svelteCheck = hasDependency(packageJson, ["svelte"]);
    if (svelteCheck) {
      detectedVia.push(`${svelteCheck} in dependencies`);
      return {
        framework: "svelte",
        confidence: "medium",
        detectedVia,
      };
    }
  }
  if (hasDependency(packageJson, ["@sveltejs/kit"])) {
    detectedVia.push("@sveltejs/kit in dependencies");
    return {
      framework: "sveltekit",
      confidence: "high",
      detectedVia,
    };
  }

  // Check for Nuxt (which includes Vue)
  const nuxtConfigFile = hasConfigFile(projectPath, [
    "nuxt.config.js",
    "nuxt.config.ts",
  ]);
  if (nuxtConfigFile) {
    detectedVia.push(nuxtConfigFile);
    const nuxtCheck = hasDependency(packageJson, ["nuxt"]);
    if (nuxtCheck) {
      detectedVia.push(`${nuxtCheck} in dependencies`);
    }
    return {
      framework: "nuxt",
      confidence: nuxtCheck ? "high" : "medium",
      detectedVia,
    };
  }
  if (hasDependency(packageJson, ["nuxt"])) {
    detectedVia.push("nuxt in dependencies");
    return {
      framework: "nuxt",
      confidence: "high",
      detectedVia,
    };
  }

  // Check for Angular
  const angularConfigFile = hasConfigFile(projectPath, ["angular.json"]);
  if (angularConfigFile) {
    detectedVia.push(angularConfigFile);
    return {
      framework: "angular",
      confidence: "high",
      detectedVia,
    };
  }
  if (hasDependency(packageJson, ["@angular/core"])) {
    detectedVia.push("@angular/core in dependencies");
    return {
      framework: "angular",
      confidence: "high",
      detectedVia,
    };
  }

  // Check for standalone React
  const reactDom = hasDependency(packageJson, ["react-dom"]);
  const react = hasDependency(packageJson, ["react"]);
  if (react && reactDom) {
    detectedVia.push("react/react-dom in dependencies");
    return {
      framework: "react",
      confidence: "high",
      detectedVia,
    };
  }
  if (react) {
    detectedVia.push("react in dependencies");
    return {
      framework: "react",
      confidence: "medium",
      detectedVia,
    };
  }

  // Check for standalone Vue
  if (hasDependency(packageJson, ["vue"])) {
    detectedVia.push("vue in dependencies");
    return {
      framework: "vue",
      confidence: "medium",
      detectedVia,
    };
  }

  // Check for standalone Svelte (without SvelteKit)
  if (hasDependency(packageJson, ["svelte"]) && !svelteConfigFile) {
    detectedVia.push("svelte in dependencies");
    return {
      framework: "svelte",
      confidence: "medium",
      detectedVia,
    };
  }

  return {
    framework: null,
    confidence: "low",
    detectedVia,
  };
}
