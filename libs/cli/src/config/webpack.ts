/**
 * Webpack config generator
 * Generates temporary Webpack configs that extend user's config and inject Smappy plugin
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
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

    // Write the config file (use .js for compatibility)
    const configPath = await writeTempConfig(
      tempDir,
      "webpack.config.temp.js",
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
    _outputDir: string,
    debug = false,
  ): string {
    // Use dynamic import for ESM compatibility and webpack-merge for extending config
    return `const { webpackBundleAnalysisPlugin } = require('@smappy/cli/plugins/webpack');

// Import user's existing config
let userConfig;
try {
  userConfig = require('${userConfigPath.replace(/\\/g, "/")}');

  // Handle default exports from ESM modules
  if (userConfig.default) {
    userConfig = userConfig.default;
  }

  // If config is a function, call it with environment
  if (typeof userConfig === 'function') {
    userConfig = userConfig({ mode: 'production' }, {});
  }
} catch (error) {
  console.warn('[Smappy] Could not load user config, using minimal config:', error.message);
  userConfig = {
    mode: 'production',
    entry: './src/index.js',
    output: {
      path: require('path').resolve(__dirname, 'dist'),
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

module.exports = userConfig;
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
    return `const { webpackBundleAnalysisPlugin } = require('@smappy/cli/plugins/webpack');
const path = require('path');

module.exports = {
  mode: 'production',
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, '${outputDir.replace(/\\/g, "/")}'),
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
