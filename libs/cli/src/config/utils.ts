/**
 * Utility functions for config generation
 */

import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { TempConfigResult } from "./types.js";

/**
 * Create a temporary directory for config files
 */
export async function createTempDir(prefix = "smappy"): Promise<string> {
  const tempDir = join(
    tmpdir(),
    `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
  );
  await mkdir(tempDir, { recursive: true });
  return tempDir;
}

/**
 * Create a cleanup function for temporary files
 */
export function createCleanup(
  tempDir: string,
  keepTemp = false,
  debug = false,
): () => Promise<void> {
  let cleanupExecuted = false;

  return async () => {
    if (cleanupExecuted) {
      return;
    }
    cleanupExecuted = true;

    if (keepTemp) {
      if (debug) {
        console.log(`[Config] Keeping temporary files at: ${tempDir}`);
      }
      return;
    }

    try {
      await rm(tempDir, { recursive: true, force: true });
      if (debug) {
        console.log(`[Config] Cleaned up temporary directory: ${tempDir}`);
      }
    } catch (error) {
      if (debug) {
        console.warn(`[Config] Failed to cleanup ${tempDir}:`, error);
      }
    }
  };
}

/**
 * Write a config file to the temporary directory
 */
export async function writeTempConfig(
  tempDir: string,
  fileName: string,
  content: string,
  debug = false,
): Promise<string> {
  const configPath = join(tempDir, fileName);
  await writeFile(configPath, content, "utf-8");

  if (debug) {
    console.log(`[Config] Created temporary config: ${configPath}`);
  }

  return configPath;
}

/**
 * Register cleanup handlers for process exit
 */
export function registerCleanupHandlers(
  cleanup: () => Promise<void>,
  debug = false,
): void {
  let handlersRegistered = false;

  if (handlersRegistered) {
    return;
  }

  const cleanupSync = () => {
    // Attempt synchronous cleanup on exit
    try {
      cleanup().catch(() => {
        // Ignore errors during exit cleanup
      });
    } catch {
      // Ignore errors
    }
  };

  process.on("exit", () => {
    if (debug) {
      console.log("[Config] Process exit - cleaning up...");
    }
    cleanupSync();
  });

  process.on("SIGINT", () => {
    if (debug) {
      console.log("[Config] SIGINT received - cleaning up...");
    }
    cleanupSync();
    process.exit(130);
  });

  process.on("SIGTERM", () => {
    if (debug) {
      console.log("[Config] SIGTERM received - cleaning up...");
    }
    cleanupSync();
    process.exit(143);
  });

  handlersRegistered = true;
}

/**
 * Create a standard temp config result
 */
export async function createTempConfigResult(
  tempDir: string,
  configPath: string,
  keepTemp = false,
  debug = false,
): Promise<TempConfigResult> {
  const cleanup = createCleanup(tempDir, keepTemp, debug);

  // Register cleanup handlers
  registerCleanupHandlers(cleanup, debug);

  return {
    configPath,
    tempDir,
    cleanup,
  };
}
