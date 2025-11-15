/**
 * Next.js config generator
 * Generates temporary Next.js configs that wrap user's config and inject Smappy plugin
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
 * Next.js config generator
 */
export class NextjsConfigGenerator implements ConfigGenerator {
  supports(bundler: DetectionResult["bundler"]): boolean {
    return bundler === "nextjs";
  }

  async generate(options: TempConfigOptions): Promise<TempConfigResult> {
    const { projectPath, projectName, outputDir, keepTemp, debug } = options;

    // Create temporary directory
    const tempDir = await createTempDir("smappy-nextjs");

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
      "next.config.temp.js",
      configContent,
      debug,
    );

    // Create and return result with cleanup
    return createTempConfigResult(tempDir, configPath, keepTemp, debug);
  }

  /**
   * Find user's existing Next.js config
   */
  private findUserConfig(projectPath: string): string | null {
    const configNames = ["next.config.js", "next.config.mjs", "next.config.ts"];

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
    _outputDir: string,
    debug = false,
  ): string {
    // If user has a config, wrap it; otherwise create minimal config
    if (userConfigPath) {
      return this.generateWrappingConfig(
        projectPath,
        projectName,
        userConfigPath,
        debug,
      );
    } else {
      return this.generateMinimalConfig(projectName, debug);
    }
  }

  /**
   * Generate config that wraps user's existing config
   */
  private generateWrappingConfig(
    _projectPath: string,
    projectName: string,
    userConfigPath: string,
    debug = false,
  ): string {
    // Next.js config is often a function or object, wrap it appropriately
    return `const { nextjsBundleAnalysisPlugin } = require('@smappy/cli/plugins/nextjs');

// Import user's existing config
let userConfig;
try {
  userConfig = require('${userConfigPath.replace(/\\/g, "/")}');

  // Handle default exports from ESM modules
  if (userConfig.default) {
    userConfig = userConfig.default;
  }
} catch (error) {
  console.warn('[Smappy] Could not load user config, using minimal config:', error.message);
  userConfig = {};
}

// Wrap the webpack config to inject Smappy plugin
const smappyConfig = {
  ...userConfig,
  webpack: (config, context) => {
    // Call user's webpack function if it exists
    if (typeof userConfig.webpack === 'function') {
      config = userConfig.webpack(config, context);
    }

    // Add Smappy plugin
    const SmappyPlugin = nextjsBundleAnalysisPlugin({
      projectName: '${projectName}',
      autoIngest: true,
    }, {
      debug: ${debug},
    });

    if (!config.plugins) {
      config.plugins = [];
    }
    config.plugins.push(SmappyPlugin);

    return config;
  },
};

module.exports = smappyConfig;
`;
  }

  /**
   * Generate minimal config when user has no config
   */
  private generateMinimalConfig(projectName: string, debug = false): string {
    return `const { nextjsBundleAnalysisPlugin } = require('@smappy/cli/plugins/nextjs');

module.exports = {
  webpack: (config, context) => {
    const SmappyPlugin = nextjsBundleAnalysisPlugin({
      projectName: '${projectName}',
      autoIngest: true,
    }, {
      debug: ${debug},
    });

    if (!config.plugins) {
      config.plugins = [];
    }
    config.plugins.push(SmappyPlugin);

    return config;
  },
};
`;
  }
}
