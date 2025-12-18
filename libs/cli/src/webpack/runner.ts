import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { StatsCompilation } from 'webpack';
import type { BundlerAdapter } from '../plugins/adapters.ts';
import { BuildRunner, npx } from '../runner/abstract.ts';
import { createTempDir } from '../runner/temp.ts';
import type { BuildRunOptions } from '../runner/types.ts';
import { WebpackAdapter } from './adapter.ts';

export class WebpackBuildRunner extends BuildRunner {
  override async runBuild(
    options: BuildRunOptions,
  ): Promise<BundlerAdapter | null> {
    const tempDir = await createTempDir();
    const statsFile = join(tempDir, 'smappy-webpack-stats.json');

    if (options.skipBuild) {
      console.log(`\nSkipping build execution (skipBuild option enabled).`);
      return null;
    }

    // Run the build
    npx(this.project, 'webpack', [
      '--mode=production',
      '--profile',
      `--json=${statsFile}`,
    ]);

    const statsJson = await readFile(statsFile, 'utf8');
    const stats = JSON.parse(statsJson) as StatsCompilation;
    return new WebpackAdapter(this.project, stats);
  }
}
