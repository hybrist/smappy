import { generateTempConfig, type TempConfigResult } from "../config/index.ts";
import { BuildRunner } from "./abstract.ts";
import { runBuild } from "./runner.ts";
import type { BuildRunOptions } from "./types.ts";

export class LegacyBuildImporter extends BuildRunner {
  override async runBuild(options: BuildRunOptions): Promise<void> {
    console.log("\nGenerating temporary build configuration...");

    let tempConfig: TempConfigResult | null = null;

    const { keepTemp, verbose, skipBuild } = options;

    try {
      // Generate temporary config
      tempConfig = await generateTempConfig({
        projectPath: this.project.path,
        projectName: this.project.name,
        bundler: this.project.bundler,
        debug: verbose,
        keepTemp,
      });

      if (verbose) {
        console.log(`  Config path: ${tempConfig.configPath}`);
        console.log(`  Temp directory: ${tempConfig.tempDir}`);
      }

      // Skip build if requested (for testing or dry-run)
      if (skipBuild) {
        console.log("\n✅ Configuration generated successfully!");
        console.log(`\nSkipping build execution (skipBuild option enabled).`);
        console.log(`Temporary config: ${tempConfig.configPath}`);
        return;
      }

      console.log("\nRunning build with analysis plugin...");

      // Run the build
      const buildResult = await runBuild({
        projectPath: this.project.path,
        configPath: tempConfig.configPath,
        bundler: this.project.bundler,
        debug: verbose,
      });

      if (buildResult.success) {
        console.log("\n✅ Build and analysis complete!");
        console.log(
          `\nBundle data has been extracted and is ready for analysis.`,
        );
      } else {
        console.error("\n❌ Build failed!");
        if (buildResult.error) {
          console.error(`  Error: ${buildResult.error}`);
        }
        if (!verbose && buildResult.stderr) {
          console.error("\nBuild errors:");
          console.error(buildResult.stderr);
        }
        if (!verbose && buildResult.stdout) {
          console.log("\nBuild output:");
          console.log(buildResult.stdout);
        }
      }
    } catch (error) {
      console.error("\n❌ Failed to run bundle analysis:");
      console.error(error instanceof Error ? error.message : String(error));
      if (verbose && error instanceof Error && error.stack) {
        console.error("\nStack trace:");
        console.error(error.stack);
      }
    } finally {
      // Always cleanup temporary files
      if (tempConfig) {
        try {
          await tempConfig.cleanup();
        } catch (cleanupError) {
          if (verbose) {
            console.warn(
              "Warning: Failed to cleanup temporary files:",
              cleanupError,
            );
          }
        }
      }
    }
  }
}
