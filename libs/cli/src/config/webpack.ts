/**
 * Webpack config generator
 * Generates temporary Webpack configs that extend user's config and inject Smappy plugin
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import type {
  ConfigGenerator,
  TempConfigOptions,
  TempConfigResult,
} from "./types.ts";
import type { DetectionResult } from "../detection/index.ts";
import {
  createTempDir,
  writeTempConfig,
  createTempConfigResult,
} from "./utils.ts";

/**
 * Webpack config generator
 */
export class WebpackConfigGenerator implements ConfigGenerator {
  supports(bundler: DetectionResult["bundler"]): boolean {
    return bundler === "webpack";
  }

  async generate(options: TempConfigOptions): Promise<TempConfigResult> {
    const { projectPath, projectName, outputDir, keepTemp, debug } = options;

    // Create temporary directory
    const tempDir = await createTempDir("smappy-webpack");

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

    // Write the config file (use .mjs for ESM compatibility)
    const configPath = await writeTempConfig(
      tempDir,
      "webpack.config.temp.mjs",
      configContent,
      debug,
    );

    // Create and return result with cleanup
    return createTempConfigResult(tempDir, configPath, keepTemp, debug);
  }

  /**
   * Find user's existing Webpack config
   */
  private findUserConfig(projectPath: string): string | null {
    const configNames = [
      "webpack.config.js",
      "webpack.config.ts",
      "webpack.config.mjs",
      "webpack.config.cjs",
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
    let pluginPath: string;

    // Resolve the absolute path to the plugin
    // Workaround for Vitest:
    if (
      typeof import.meta.resolve !== "function" &&
      process.env.VITEST === "true"
    ) {
      const cliRequire = createRequire(fileURLToPath(import.meta.url));
      pluginPath = cliRequire.resolve("@smappy/cli/plugins/webpack");
    } else {
      pluginPath = import.meta.resolve("@smappy/cli/plugins/webpack");
    }

    // If user has a config, extend it; otherwise create minimal config
    if (userConfigPath) {
      return this.generateExtendingConfig(
        projectPath,
        projectName,
        userConfigPath,
        outputDir,
        pluginPath,
        debug,
      );
    } else {
      return this.generateMinimalConfig(
        projectName,
        outputDir,
        pluginPath,
        debug,
      );
    }
  }

  /**
   * Generate config that extends user's existing config
   */
  private generateExtendingConfig(
    _projectPath: string,
    projectName: string,
    userConfigPath: string,
    _outputDir: string,
    pluginPath: string,
    debug = false,
  ): string {
    // Use dynamic import for ESM compatibility
    return `import { webpackBundleAnalysisPlugin } from '${pluginPath}';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import user's existing config
async function loadConfig() {
  let userConfig;
  try {
    const imported = await import('${userConfigPath.replace(/\\/g, "/")}');
    userConfig = imported.default || imported;

    // If config is a function, call it with environment
    if (typeof userConfig === 'function') {
      userConfig = await userConfig({ mode: 'production' }, {});
    }
  } catch (error) {
    console.warn('[Smappy] Could not load user config, using minimal config:', error.message);
    userConfig = {
      mode: 'production',
      entry: './src/index.js',
      output: {
        path: resolve(__dirname, 'dist'),
        filename: '[name].[contenthash].js',
      },
    };
  }

  // Ensure plugins array exists
  if (!userConfig.plugins) {
    userConfig.plugins = [];
  }

  // Add Smappy plugin
  userConfig.plugins.push(
    webpackBundleAnalysisPlugin({
      projectName: '${projectName}',
      autoIngest: true,
      productionOnly: false,
    }, {
      debug: ${debug},
    })
  );

  return userConfig;
}

export default loadConfig();
`;
  }

  /**
   * Generate minimal config when user has no config
   */
  private generateMinimalConfig(
    projectName: string,
    outputDir: string,
    pluginPath: string,
    debug = false,
  ): string {
    return `import { webpackBundleAnalysisPlugin } from '${pluginPath}';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
  mode: 'production',
  entry: './src/index.js',
  output: {
    path: resolve(__dirname, '${outputDir.replace(/\\/g, "/")}'),
    filename: '[name].[contenthash].js',
    clean: true,
  },
  devtool: 'source-map',
  plugins: [
    webpackBundleAnalysisPlugin({
      projectName: '${projectName}',
      autoIngest: true,
      productionOnly: false,
    }, {
      debug: ${debug},
    }),
  ],
};
`;
  }
}
