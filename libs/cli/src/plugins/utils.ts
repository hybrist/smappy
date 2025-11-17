/**
 * Shared utilities for bundler plugin development
 * Common functions for parsing stats, extracting source maps, and normalizing data
 */

import type { BundleInput, ModuleInput } from "@smappy/core";
import { readFileSync } from "node:fs";
import { join, dirname, extname } from "node:path";

// ============================================================================
// Source Map Utilities
// ============================================================================

/**
 * Extract source map from a bundle file
 * Supports inline source maps and external source map files
 *
 * @param bundleContent - The bundle content
 * @param bundlePath - Path to the bundle file
 * @param outputDir - Output directory where source maps might be located
 * @returns Source map content or undefined if not found
 */
export function extractSourceMap(
  bundleContent: string,
  bundlePath: string,
  outputDir?: string,
): string | undefined {
  // Check for inline source map
  const inlineSourceMapMatch = bundleContent.match(
    /\/\/# sourceMappingURL=data:application\/json[^]*?base64,([A-Za-z0-9+/=]+)/,
  );
  if (inlineSourceMapMatch) {
    try {
      const decoded = Buffer.from(inlineSourceMapMatch[1], "base64").toString(
        "utf-8",
      );
      // Validate it's valid JSON
      JSON.parse(decoded);
      return decoded;
    } catch {
      // Failed to decode or invalid JSON, continue
    }
  }

  // Check for external source map reference
  const externalSourceMapMatch = bundleContent.match(
    /\/\/# sourceMappingURL=([^\s]+)/,
  );
  if (externalSourceMapMatch) {
    const sourceMapPath = externalSourceMapMatch[1];
    const bundleDir = dirname(bundlePath);
    const outputDirectory = outputDir || bundleDir;

    try {
      // Try relative to bundle directory
      const fullPath = join(outputDirectory, sourceMapPath);
      return readFileSync(fullPath, "utf-8");
    } catch {
      // Try relative to output directory
      try {
        const outputPath = join(outputDirectory, sourceMapPath);
        return readFileSync(outputPath, "utf-8");
      } catch {
        // Source map not found
        return undefined;
      }
    }
  }

  return undefined;
}

/**
 * Extract source map from a file path
 * Attempts to read .map file next to the bundle
 *
 * @param bundlePath - Path to the bundle file
 * @returns Source map content or undefined if not found
 */
export function extractSourceMapFromPath(
  bundlePath: string,
): string | undefined {
  const sourceMapPath = `${bundlePath}.map`;
  try {
    return readFileSync(sourceMapPath, "utf-8");
  } catch {
    return undefined;
  }
}

// ============================================================================
// File Type Detection
// ============================================================================

/**
 * Determine file type from file path or extension
 *
 * @param filePath - Path to the file
 * @returns File type identifier
 */
export function detectFileType(
  filePath: string,
): BundleInput["type"] | ModuleInput["fileType"] {
  const ext = extname(filePath).toLowerCase();
  const extMap: Record<string, BundleInput["type"] | ModuleInput["fileType"]> =
    {
      ".js": "js",
      ".mjs": "mjs",
      ".cjs": "cjs",
      ".jsx": "jsx",
      ".ts": "ts",
      ".tsx": "tsx",
      ".json": "json",
      ".css": "css",
    };

  return extMap[ext] || "js";
}

/**
 * Check if a file is a JavaScript/TypeScript module
 *
 * @param filePath - Path to the file
 * @returns True if file is a JS/TS module
 */
export function isModuleFile(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase();
  return [".js", ".mjs", ".cjs", ".jsx", ".ts", ".tsx"].includes(ext);
}

/**
 * Check if a file is a source file (not a bundle or generated file)
 *
 * @param filePath - Path to the file
 * @returns True if file appears to be a source file
 */
export function isSourceFile(filePath: string): boolean {
  // Exclude node_modules, dist, build, .next, etc.
  const excludePatterns = [
    /node_modules/,
    /\/dist\//,
    /\/build\//,
    /\/\.next\//,
    /\/\.vite\//,
    /\/\.cache\//,
    /\.min\./,
    /\.bundle\./,
  ];

  return !excludePatterns.some((pattern) => pattern.test(filePath));
}

// ============================================================================
// Path Utilities
// ============================================================================

/**
 * Normalize a file path to a consistent format
 * Removes redundant separators and normalizes relative paths
 *
 * @param filePath - Path to normalize
 * @param baseDir - Base directory for resolving relative paths
 * @returns Normalized path
 */
export function normalizePath(filePath: string, baseDir?: string): string {
  // Normalize separators
  let normalized = filePath.replace(/\\/g, "/");

  // Track if the original path was absolute
  const isAbsolute = normalized.startsWith("/") || normalized.match(/^[A-Z]:/);

  // Remove leading slashes for processing (we'll add back if needed)
  normalized = normalized.replace(/^\/+/, "");

  // Resolve relative paths if baseDir is provided
  if (baseDir && !isAbsolute) {
    const base = baseDir.replace(/\\/g, "/").replace(/\/+$/, "");
    normalized = `${base}/${normalized}`;
  }

  // Remove redundant path segments
  const parts = normalized.split("/");
  const resolved: string[] = [];

  for (const part of parts) {
    if (part === "." || part === "") {
      continue;
    } else if (part === "..") {
      resolved.pop();
    } else {
      resolved.push(part);
    }
  }

  const result = resolved.join("/");

  // Restore leading slash ONLY if:
  // 1. We joined with an absolute baseDir (baseDir starts with /), OR
  // 2. The original path was absolute Unix-style
  // Do NOT add leading slash for Windows absolute paths or relative paths
  const baseDirIsAbsolute =
    baseDir && baseDir.replace(/\\/g, "/").startsWith("/");
  const isWindowsPath = /^[A-Z]:/.test(result);

  if (
    (baseDirIsAbsolute || (isAbsolute && !isWindowsPath)) &&
    !result.startsWith("/")
  ) {
    return `/${result}`;
  }

  return result;
}

/**
 * Resolve a module path relative to a base path
 * Handles node_modules, relative imports, and absolute paths
 *
 * @param importPath - Import path from source code
 * @param fromPath - Path of the file making the import
 * @param baseDir - Base directory of the project
 * @returns Resolved module path
 */
export function resolveModulePath(
  importPath: string,
  fromPath: string,
  baseDir: string,
): string {
  // Absolute path
  if (importPath.startsWith("/")) {
    // Remove leading slash and normalize
    return normalizePath(importPath.slice(1));
  }

  // Node module (package name)
  if (!importPath.startsWith(".") && !importPath.startsWith("/")) {
    return `node_modules/${importPath}`;
  }

  // Relative path
  const fromDir = dirname(fromPath);
  const resolved = join(fromDir, importPath);
  return normalizePath(resolved, baseDir);
}

// ============================================================================
// Size Calculation Utilities
// ============================================================================

/**
 * Calculate raw size of content in bytes
 *
 * @param content - Content to measure
 * @returns Size in bytes
 */
export function calculateSize(content: string | Buffer): number {
  if (typeof content === "string") {
    return Buffer.byteLength(content, "utf-8");
  }
  return content.length;
}

/**
 * Estimate size from a number (if already calculated)
 *
 * @param size - Size value (number or undefined)
 * @param fallbackContent - Content to measure if size is undefined
 * @returns Size in bytes
 */
export function getSize(
  size: number | undefined,
  fallbackContent?: string,
): number {
  if (size !== undefined) {
    return size;
  }
  if (fallbackContent !== undefined) {
    return calculateSize(fallbackContent);
  }
  return 0;
}

// ============================================================================
// Content Reading Utilities
// ============================================================================

/**
 * Read file content safely
 *
 * @param filePath - Path to the file
 * @returns File content or undefined if file cannot be read
 */
export function readFileContent(filePath: string): string | undefined {
  try {
    return readFileSync(filePath, "utf-8");
  } catch {
    return undefined;
  }
}

/**
 * Read file content with error handling
 *
 * @param filePath - Path to the file
 * @param errors - Array to append errors to
 * @returns File content or undefined if file cannot be read
 */
export function readFileContentSafe(
  filePath: string,
  errors: string[],
): string | undefined {
  try {
    return readFileSync(filePath, "utf-8");
  } catch (error) {
    errors.push(`Failed to read file ${filePath}: ${error}`);
    return undefined;
  }
}

// ============================================================================
// Filtering Utilities
// ============================================================================

/**
 * Check if a file path matches any exclusion patterns
 *
 * @param filePath - Path to check
 * @param excludePatterns - Array of exclusion patterns (glob or regex strings)
 * @returns True if file should be excluded
 */
export function shouldExcludeFile(
  filePath: string,
  excludePatterns?: string[],
): boolean {
  if (!excludePatterns || excludePatterns.length === 0) {
    return false;
  }

  return excludePatterns.some((pattern) => {
    // Try as regex first
    try {
      const regex = new RegExp(pattern);
      return regex.test(filePath);
    } catch {
      // If not a valid regex, treat as glob pattern (simple implementation)
      // Escape special regex characters except * and ?
      const escaped = pattern
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/\*\*/g, ".*")
        .replace(/\*/g, "[^/]*")
        .replace(/\?/g, ".");
      const regex = new RegExp(escaped);
      return regex.test(filePath);
    }
  });
}

/**
 * Check if a file path matches any inclusion patterns
 *
 * @param filePath - Path to check
 * @param includePatterns - Array of inclusion patterns (glob or regex strings)
 * @returns True if file should be included
 */
export function shouldIncludeFile(
  filePath: string,
  includePatterns?: string[],
): boolean {
  if (!includePatterns || includePatterns.length === 0) {
    return true; // Include all if no patterns specified
  }

  return includePatterns.some((pattern) => {
    try {
      const regex = new RegExp(pattern);
      return regex.test(filePath);
    } catch {
      // Escape special regex characters except * and ?
      const escaped = pattern
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/\*\*/g, ".*")
        .replace(/\*/g, "[^/]*")
        .replace(/\?/g, ".");
      const regex = new RegExp(escaped);
      return regex.test(filePath);
    }
  });
}
