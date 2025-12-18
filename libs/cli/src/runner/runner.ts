/**
 * Build runner
 * Executes bundler builds with temporary configs
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { BuildOptions, BuildResult } from './types.ts';

/**
 * Get the build command for a specific bundler
 */
function getBuildCommand(
  bundler: string,
  configPath: string,
): { command: string; args: string[] } {
  switch (bundler) {
    case 'vite':
      return {
        command: 'npx',
        args: ['vite', 'build', '--config', configPath],
      };
    case 'webpack':
      return {
        command: 'npx',
        args: ['webpack', '--config', configPath],
      };
    case 'nextjs':
      // Next.js uses the config via environment variable or direct file
      // We need to temporarily copy the config to the project directory
      return {
        command: 'npx',
        args: ['next', 'build'],
      };
    case 'rollup':
      return {
        command: 'npx',
        args: ['rollup', '--config', configPath],
      };
    default:
      throw new Error(`Unsupported bundler: ${bundler}`);
  }
}

/**
 * Run a build with the given options
 */
export async function runBuild(options: BuildOptions): Promise<BuildResult> {
  const { projectPath, configPath, bundler, debug } = options;

  // Validate config exists
  if (!existsSync(configPath)) {
    return {
      success: false,
      exitCode: 1,
      error: `Config file does not exist: ${configPath}`,
    };
  }

  // Get build command
  const { command, args } = getBuildCommand(bundler || 'vite', configPath);

  if (debug) {
    console.log(`[Build] Running: ${command} ${args.join(' ')}`);
    console.log(`[Build] Working directory: ${projectPath}`);
  }

  return new Promise<BuildResult>((resolvePromise) => {
    const child = spawn(command, args, {
      cwd: resolve(projectPath),
      stdio: debug ? 'inherit' : 'pipe',
      env: {
        ...process.env,
        // Disable any interactive prompts
        CI: 'true',
      },
    });

    let stdout = '';
    let stderr = '';

    // Capture output if not inheriting stdio
    if (!debug) {
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
    }

    child.on('error', (error) => {
      resolvePromise({
        success: false,
        exitCode: null,
        stdout,
        stderr,
        error: `Failed to start build process: ${error.message}`,
      });
    });

    child.on('close', (code) => {
      const success = code === 0;

      if (!success && debug) {
        console.error(`[Build] Build failed with exit code ${code}`);
      }

      resolvePromise({
        success,
        exitCode: code,
        stdout,
        stderr,
        error: success ? undefined : `Build failed with exit code ${code}`,
      });
    });
  });
}
