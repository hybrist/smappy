/**
 * Vite config generator
 * Generates temporary Vite configs that extend user's config and inject Smappy plugin
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import type { ConfigGenerator, TempConfigOptions, TempConfigResult } from "./types.js";
import type { DetectionResult } from "../detection/index.js";
import {
  createTempDir,
  writeTempConfig,
  createTempConfigResult,
} from "./utils.js";

/**
 * Vite config generator
 */
export class ViteConfigGenerator implements ConfigGenerator {
  supports(bundler: DetectionResult["bundler"]): boolean {
    return bundler === "vite";
  }

  async generate(options: TempConfigOptions): Promise<TempConfigResult> {
    const { projectPath, projectName, outputDir, keepTemp, debug } = options;

    // Create temporary directory
    const tempDir = await createTempDir("smappy-vite");

    // Find user's existing config
    const userConfig = this.findUserConfig(projectPath);

    // Generate the temporary config content
    const configContent = this.generateConfigContent(
      projectPath,
      projectName,
      userConfig,
      outputDir || join(tempDir, "analysis"),
      debug,
    );

    // Write the config file
    const configPath = await writeTempConfig(
      tempDir,
      "vite.config.temp.ts",
      configContent,
      debug,
    );

    // Create and return result with cleanup
    return createTempConfigResult(tempDir, configPath, keepTemp, debug);
  }

  /**
   * Find user's existing Vite config
   */
  private findUserConfig(projectPath: string): string | null {
    const configNames = [
      "vite.config.ts",
      "vite.config.mts",
      "vite.config.js",
      "vite.config.mjs",
    ];

    for (const configName of configNames) {
      const configPath = join(projectPath, configName);
      if (existsSync(configPath)) {
        return configPath;
      }
    }

    return null;
  }

  /**
   * Generate the temporary config content
   */
  private generateConfigContent(
    projectPath: string,
    projectName: string,
    userConfigPath: string | null,
    outputDir: string,
    debug = false,
  ): string {
    // If user has a config, extend it; otherwise create minimal config
    if (userConfigPath) {
      return this.generateExtendingConfig(
        projectPath,
        projectName,
        userConfigPath,
        outputDir,
        debug,
      );
    } else {
      return this.generateMinimalConfig(projectName, outputDir, debug);
    }
  }

  /**
   * Generate config that extends user's existing config
   */
  private generateExtendingConfig(
    _projectPath: string,
    projectName: string,
    userConfigPath: string,
    outputDir: string,
    debug = false,
  ): string {
    // Import user's config and extend it with Smappy plugin
    // Use dynamic import inside defineConfig to avoid top-level await issues
    return `import { defineConfig, mergeConfig } from 'vite';
import { viteBundleAnalysisPlugin } from '@smappy/cli/plugins/vite';

export default defineConfig(async () => {
  // Import user's existing config
  let userConfig;
  try {
    const imported = await import('${userConfigPath.replace(/\\/g, "/")}');
    userConfig = imported.default || imported;
    
    // If config is a function, call it
    if (typeof userConfig === 'function') {
      userConfig = await userConfig({ command: 'build', mode: 'production' });
    }
  } catch (error) {
    console.warn('[Smappy] Could not import user config, using minimal config:', error.message);
    userConfig = {};
  }

  // Add Smappy plugin to user's config
  const smappyConfig = {
    plugins: [
      viteBundleAnalysisPlugin({
        projectName: '${projectName}',
        autoIngest: true,
        debug: ${debug},
      }),
    ],
  };

  // Merge configs, ensuring Smappy plugin is added last
  return mergeConfig(userConfig, smappyConfig);
});
`;
  }

  /**
   * Generate minimal config when user has no config
   */
  private generateMinimalConfig(
    projectName: string,
    outputDir: string,
    debug = false,
  ): string {
    return `import { defineConfig } from 'vite';
import { viteBundleAnalysisPlugin } from '@smappy/cli/plugins/vite';

export default defineConfig({
  plugins: [
    viteBundleAnalysisPlugin({
      projectName: '${projectName}',
      autoIngest: true,
      debug: ${debug},
    }),
  ],
  build: {
    outDir: '${outputDir.replace(/\\/g, "/")}',
  },
});
`;
  }
}
