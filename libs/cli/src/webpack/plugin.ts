import { writeFile } from 'node:fs/promises';
import type { Compiler, Stats } from 'webpack';

/**
 * Options for WebpackSmappyPlugin.
 */
export interface WebpackPluginOptions {
  statsFile: string;
}

/**
 * Alternative to passing `--json` to webpack.
 */
export class WebpackSmappyPlugin {
  private options: WebpackPluginOptions;

  constructor(options: WebpackPluginOptions) {
    this.options = options;
  }

  /**
   * Apply the plugin to webpack compiler
   */
  apply(compiler: Compiler): void {
    const pluginName = 'webpack-smappy-analysis';

    // Hook into compilation completion
    compiler.hooks.done.tapAsync(
      pluginName,
      async (stats: Stats, callback: () => void) => {
        try {
          // Get output path from webpack config
          const { statsFile } = this.options;

          const statsJson = stats.toJson({
            all: false,
            modules: true,
            chunks: true,
            assets: true,
            chunkModules: true,
            chunkOrigins: true,
            reasons: true,
            source: false, // Don't include source in stats for performance
          });
          await writeFile(statsFile, JSON.stringify(statsJson));
          console.error(
            '[smappy-plugin] stats are successfully stored as json to %s',
            statsFile,
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          console.error(
            '[smappy] Failed to generate stats file:',
            errorMessage,
          );
        }
        callback();
      },
    );
  }
}
