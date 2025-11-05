/**
 * Size calculation module
 * Calculates bundle and module sizes including gzip compression
 */

import { computeRawSize, computeGzipSize } from './calculator.js';

/**
 * Calculate the gzipped size of content
 * @param content - Content to compress
 * @returns Size in bytes after gzip compression
 */
export function calculateGzipSize(content: string): number {
  return computeGzipSize(content);
}

/**
 * Calculate the raw size of content
 * @param content - Content to measure
 * @returns Size in bytes
 */
export function calculateRawSize(content: string): number {
  return computeRawSize(content);
}

/**
 * Calculate sizes for a bundle
 * @param content - Bundle content
 * @returns Object with total and gzipped sizes
 */
export function calculateBundleSizes(content: string): {
  total: number;
  gzipped: number;
} {
  return {
    total: calculateRawSize(content),
    gzipped: calculateGzipSize(content),
  };
}
