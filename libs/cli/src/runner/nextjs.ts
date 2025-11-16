import { BuildRunner, npx } from "./abstract.ts";
import type { BuildRunOptions, ProjectInfo } from "./types.ts";
import { join } from "node:path";
import { glob, rename, unlink, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

export class NextjsBuildRunner extends BuildRunner {
  override async runBuild(options: BuildRunOptions): Promise<void> {
    // Run the build
    const statsFile = "/tmp/smappy-webpack-stats.json";
    await using _config = await this.createTempConfig(statsFile);
    if (options.skipBuild) {
      console.log("\n✅ Configuration generated successfully!");
      console.log(`\nSkipping build execution (skipBuild option enabled).`);
      return;
    }

    npx(this.project, "next", [
      "build",
      // TODO: Inject stuff for making this write the stats file.
    ]);
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
      pluginPath = cliRequire.resolve("@smappy/cli/plugins/webpack");
    } else {
      pluginPath = import.meta.resolve("@smappy/cli/plugins/webpack");
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
import SmappyPlugin from '${pluginPath}';

export default {
  ...userConfig,
  productionBrowserSourceMaps: true,
  webpack: (config, options) => {
    if (!options.isServer) {
      config.devtool = 'source-map';
    }
    config.plugins.push(new SmappyPlugin({
      projectName: "DELETE ME",
      statsFile: ${JSON.stringify(statsFile)},
    }));
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
import SmappyPlugin from '${pluginPath}';

export default {
  productionBrowserSourceMaps: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.devtool = 'source-map';
    }
    config.plugins.push(new SmappyPlugin({
      projectName: "DELETE ME",
      statsFile: ${JSON.stringify(statsFile)},
    }));
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
