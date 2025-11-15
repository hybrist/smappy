/**
 * Utility functions for path expansion and other helpers
 */

import { homedir } from "node:os";

/**
 * Expand a path, resolving ~ to home directory
 * @param path - Path that may contain ~
 * @returns Expanded path
 */
export function expandPath(path: string): string {
  if (path.startsWith("~")) {
    return path.replace(/^~/, homedir());
  }
  return path;
}
