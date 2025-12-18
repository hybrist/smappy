/**
 * Size computation module
 * Calculates size metrics for bundles, chunks, modules, and symbols.
 * Handles raw size, gzip compression, and symbol-level size attribution via source maps.
 * Pure version using only in-memory operations (no file I/O)
 */

import { gzip } from 'pako';

/**
 * Supported encodings for byte length calculation
 */
type Encoding = 'utf-8' | 'ascii' | 'latin1' | 'base64' | 'hex';

/**
 * Calculate raw byte length of content
 * Supports different encodings for accurate size calculation
 * @param content - Content to measure
 * @param encoding - Encoding to use (default: 'utf-8')
 * @returns Size in bytes
 */
export function computeRawSize(
  content: string,
  encoding: Encoding = 'utf-8',
): number {
  if (!content) {
    return 0;
  }

  switch (encoding) {
    case 'utf-8':
      return Buffer.byteLength(content, 'utf-8');
    case 'ascii':
      return Buffer.byteLength(content, 'ascii');
    case 'latin1':
      return Buffer.byteLength(content, 'latin1');
    case 'base64':
      return Buffer.byteLength(content, 'base64');
    case 'hex':
      return Buffer.byteLength(content, 'hex');
    default:
      // Fallback to UTF-8
      return Buffer.byteLength(content, 'utf-8');
  }
}

/**
 * Calculate gzipped size of content using pako
 * Optimized for large files with performance considerations
 * @param content - Content to compress
 * @returns Size in bytes after gzip compression
 */
export function computeGzipSize(content: string): number {
  if (!content) {
    return 0;
  }

  // For large files, use streaming or chunked processing
  // For now, we'll use pako's gzip which handles large files efficiently
  try {
    const compressed = gzip(content, { level: 6 }); // Level 6 is a good balance
    return compressed.length;
  } catch (error) {
    // Fallback to raw size if compression fails
    console.warn('Gzip compression failed, using raw size:', error);
    return computeRawSize(content);
  }
}

/**
 * Aggregate chunk sizes
 * Combines multiple chunk size calculations
 * @param chunkSizes - Array of size objects for chunks
 * @returns Aggregated size information
 */
export function aggregateChunkSizes(
  chunkSizes: Array<{ raw: number; gzipped: number }>,
): {
  totalRaw: number;
  totalGzipped: number;
  chunks: Array<{ raw: number; gzipped: number }>;
} {
  const totalRaw = chunkSizes.reduce((sum, chunk) => sum + chunk.raw, 0);
  const totalGzipped = chunkSizes.reduce(
    (sum, chunk) => sum + chunk.gzipped,
    0,
  );

  return {
    totalRaw,
    totalGzipped,
    chunks: chunkSizes,
  };
}

/**
 * Aggregate bundle sizes
 * Combines multiple bundle size calculations
 * @param bundleSizes - Array of size objects for bundles
 * @returns Aggregated size information
 */
export function aggregateBundleSizes(
  bundleSizes: Array<{ raw: number; gzipped: number }>,
): {
  totalRaw: number;
  totalGzipped: number;
  bundles: Array<{ raw: number; gzipped: number }>;
} {
  const totalRaw = bundleSizes.reduce((sum, bundle) => sum + bundle.raw, 0);
  const totalGzipped = bundleSizes.reduce(
    (sum, bundle) => sum + bundle.gzipped,
    0,
  );

  return {
    totalRaw,
    totalGzipped,
    bundles: bundleSizes,
  };
}
