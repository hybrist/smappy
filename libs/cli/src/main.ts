#!/usr/bin/env node

import { Command } from "commander";
import { fileURLToPath } from "node:url";
import { analyzeCommand } from "./cmds/analyze.js";

const program = new Command();

program
  .name("smappy")
  .description("Bundle analysis tool for JavaScript/TypeScript projects")
  .version("0.0.1");

program
  .command("analyze")
  .description("Analyze a JavaScript/TypeScript project")
  .argument("[project-path]", "Path to the project directory", process.cwd())
  .option("-v, --verbose", "Enable verbose output")
  .action(async (projectPath: string, options: { verbose?: boolean }) => {
    try {
      await analyzeCommand(projectPath, options);
    } catch (error) {
      console.error(
        "Error:",
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  });

// Only parse command line arguments if this file is being run directly
// Check if the current module is the main module (cross-platform compatible)
const isMainModule =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMainModule) {
  program.parse();
}

// Export program for testing
export { program };
