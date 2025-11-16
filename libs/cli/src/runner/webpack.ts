import { BuildRunner, npx } from "./abstract.ts";
import type { BuildRunOptions } from "./types.ts";

export class WebpackBuildRunner extends BuildRunner {
  override async runBuild(options: BuildRunOptions): Promise<void> {
    if (options.skipBuild) {
      console.log(`\nSkipping build execution (skipBuild option enabled).`);
      return;
    }

    // Run the build
    const statsFile = "/tmp/smappy-webpack-stats.json";
    npx(this.project, "webpack", [
      "--mode=production",
      "--profile",
      `--json=${statsFile}`,
    ]);
  }
}
