import { glob, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { StatsCompilation } from "webpack";
import type { BundlerAdapter } from "../plugins/adapters.ts";
import { WebpackAdapter } from "../webpack/adapter.ts";
import { BuildRunner, npx } from "./abstract.ts";
import { createTempDir } from "./temp.ts";
import type { BuildRunOptions } from "./types.ts";

export class NextjsBuildRunner extends BuildRunner {
  override async runBuild(
    options: BuildRunOptions,
  ): Promise<BundlerAdapter | null> {
    // Run the build
    const tempDir = await createTempDir();
    const statsFile = join(tempDir, "smappy-webpack-stats.json");

    await using _config = await this.createTempConfig(statsFile);
    if (options.skipBuild) {
      console.log("\n✅ Configuration generated successfully!");
      console.log(`\nSkipping build execution (skipBuild option enabled).`);
      return null;
    }

    npx(this.project, "next", ["build"]);

    const statsJson = await readFile(statsFile, "utf8");
    const stats = JSON.parse(statsJson) as StatsCompilation;
    return new WebpackAdapter(this.project, stats);
  }

  private async findUserConfig(
    basename: string = "next.config",
  ): Promise<string | null> {
    const configs = glob(`${basename}.{js,mjs,ts,mts,cjs,cts}`, {
      cwd: this.project.path,
    });
    for await (const configName of configs) {
      return configName;
    }

    return null;
  }

  private async attemptRevert() {
    const backupConfig = await this.findUserConfig("smappy-base-next.config");
    if (backupConfig === null) {
      return;
    }

    const originalName = backupConfig.replace(/^smappy-base-/, "");
    await rename(
      join(this.project.path, backupConfig),
      join(this.project.path, originalName),
    );
  }

  private async createTempConfig(statsFile: string) {
    await this.attemptRevert();

    let pluginPath: string;
    // Workaround for Vitest:
    if (
      typeof import.meta.resolve !== "function" &&
      process.env.VITEST === "true"
    ) {
      const cliRequire = createRequire(fileURLToPath(import.meta.url));
      pluginPath = cliRequire.resolve("@smappy/cli/webpack/plugin");
    } else {
      pluginPath = import.meta.resolve("@smappy/cli/webpack/plugin");
    }

    const userConfig = await this.findUserConfig();
    if (userConfig) {
      const backupPath = `smappy-base-${userConfig}`;
      await rename(
        join(this.project.path, userConfig),
        join(this.project.path, backupPath),
      );

      await writeFile(
        join(this.project.path, "next.config.mjs"),
        `\
import userConfig from './${backupPath}';
import {WebpackSmappyPlugin} from '${pluginPath}';

export default {
  ...userConfig,
  productionBrowserSourceMaps: true,
  webpack: (config, options) => {
    if (!options.isServer) {
      config.devtool = 'source-map';
      config.plugins.push(new WebpackSmappyPlugin({
        statsFile: ${JSON.stringify(statsFile)},
      }));
    }
    if (typeof userConfig.webpack === 'function') {
      return userConfig.webpack(config, options);
    }
    return config;
  },
};
`,
      );
    } else {
      await writeFile(
        join(this.project.path, "next.config.mjs"),
        `\
import {WebpackSmappyPlugin} from '${pluginPath}';

export default {
  productionBrowserSourceMaps: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.devtool = 'source-map';
      config.plugins.push(new WebpackSmappyPlugin({
        statsFile: ${JSON.stringify(statsFile)},
      }));
    }
    return config;
  },
};
`,
      );
    }

    return {
      [Symbol.asyncDispose]: async () => {
        try {
          await unlink(join(this.project.path, "next.config.mjs"));
        } catch (e: unknown) {
          if (e instanceof Error && "code" in e && e.code === "ENOENT") {
            // File does not exist, ignore error
          } else {
            throw e;
          }
        }
        await this.attemptRevert();
      },
    };
  }
}
