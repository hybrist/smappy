#!/usr/bin/env node

import { Command } from 'commander';
import { fileURLToPath } from 'node:url';
import pkgJSON from '../package.json' with { type: 'json' };
import { analyzeCommand } from './cmds/analyze.ts';
import { listCommand } from './cmds/list.ts';

const program = new Command();

program
  .name('smappy')
  .description('Bundle analysis tool for JavaScript/TypeScript projects')
  .version(pkgJSON.version);

program
  .command('analyze')
  .description('Analyze a JavaScript/TypeScript project')
  .argument('[project-path]', 'Path to the project directory', process.cwd())
  .option('-v, --verbose', 'Enable verbose output')
  .option(
    '-b, --bundler <type>',
    'Override detected bundler (vite, webpack, rollup, esbuild, parcel, nextjs, angular)',
  )
  .option(
    '-f, --framework <type>',
    'Override detected framework (react, vue, svelte, angular, sveltekit, nextjs, nuxt)',
  )
  .action(
    async (
      projectPath: string,
      options: { verbose?: boolean; bundler?: string; framework?: string },
    ) => {
      try {
        const code = await analyzeCommand(projectPath, options);
        process.exit(code);
      } catch (error) {
        console.error(
          'Error:',
          error instanceof Error ? error.message : String(error),
        );
        process.exit(1);
      }
    },
  );

program
  .command('list')
  .description('List analyzed projects or analysis runs for a project')
  .argument('[project-name]', 'Project name to list runs for')
  .action(async (projectName?: string) => {
    try {
      const code = await listCommand(projectName);
      process.exit(code);
    } catch (error) {
      console.error(
        'Error:',
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
