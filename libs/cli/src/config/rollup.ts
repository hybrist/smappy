/**
 * Rollup config generator
 * Generates temporary Rollup configs that extend user's config and inject Smappy plugin
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
 * Rollup config generator
 */
export class RollupConfigGenerator implements ConfigGenerator {
  supports(bundler: DetectionResult["bundler"]): boolean {
    return bundler === "rollup";
  }

  async generate(options: TempConfigOptions): Promise<TempConfigResult> {
    const { projectPath, projectName, outputDir, keepTemp, debug } = options;

    // Create temporary directory
    const tempDir = await createTempDir("smappy-rollup");

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
      "rollup.config.temp.js",
      configContent,
      debug,
    );

    // Create and return result with cleanup
    return createTempConfigResult(tempDir, configPath, keepTemp, debug);
  }

  /**
   * Find user's existing Rollup config
   */
  private findUserConfig(projectPath: string): string | null {
    const configNames = [
      "rollup.config.js",
      "rollup.config.mjs",
      "rollup.config.ts",
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
    // Note: Rollup plugin for Smappy doesn't exist yet, this is a placeholder
    return `// Import user's existing config
import userConfigImport from '${userConfigPath.replace(/\\/g, "/")}';

// For now, just return user config as Rollup plugin is not yet implemented
// TODO: Add Smappy Rollup plugin when available
let configs = Array.isArray(userConfigImport) ? userConfigImport : [userConfigImport];

if (${debug}) {
  console.log('[Smappy] Rollup plugin not yet implemented, running user config as-is');
}

export default configs;
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
    return `export default {
  input: 'src/index.js',
  output: {
    dir: '${outputDir.replace(/\\/g, "/")}',
    format: 'esm',
    sourcemap: true,
  },
};

// Note: Rollup plugin for Smappy not yet implemented
if (${debug}) {
  console.log('[Smappy] Rollup plugin not yet implemented');
}
`;
  }
}
