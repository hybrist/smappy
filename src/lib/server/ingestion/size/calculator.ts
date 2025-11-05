/**
 * Size computation module
 * Calculates size metrics for bundles, chunks, modules, and symbols.
 * Handles raw size, gzip compression, and symbol-level size attribution via source maps.
 */

import { gzip } from 'pako';
import { SourceMapConsumer } from '@jridgewell/source-map';
import type { Symbol, SourceMap } from '../types/index.js';

/**
 * Supported encodings for byte length calculation
 */
type Encoding = 'utf-8' | 'ascii' | 'latin1' | 'base64' | 'hex';

/**
 * Represents a source map fragment mapping a symbol to bundle positions
 */
export interface SourceMapFragment {
  /** Symbol identifier */
  symbolId: string;
  /** Start position in bundle (byte offset) */
  bundleStart: number;
  /** End position in bundle (byte offset) */
  bundleEnd: number;
  /** Source file path */
  sourceFile: string;
  /** Start line in source */
  sourceStartLine: number;
  /** Start column in source */
  sourceStartCol: number;
  /** End line in source */
  sourceEndLine: number;
  /** End column in source */
  sourceEndCol: number;
}

/**
 * Calculate raw byte length of content
 * Supports different encodings for accurate size calculation
 * @param content - Content to measure
 * @param encoding - Encoding to use (default: 'utf-8')
 * @returns Size in bytes
 */
export function computeRawSize(content: string, encoding: Encoding = 'utf-8'): number {
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
 * Calculate per-symbol sizes from source maps
 * Maps bundle positions back to source symbols using source map mappings
 * @param symbols - Array of symbols extracted from AST
 * @param sourceMap - Parsed source map object
 * @param bundleContent - Bundle content for position mapping
 * @returns Map of symbol names to their attributed sizes in bytes
 */
export async function computeSymbolSizes(
  symbols: Symbol[],
  sourceMap: SourceMap,
  bundleContent: string,
): Promise<Map<string, number>> {
  const symbolSizes = new Map<string, number>();

  if (!symbols.length || !sourceMap.mappings || !bundleContent) {
    return symbolSizes;
  }

  try {
    // Create source map consumer
    const consumer = await new SourceMapConsumer({
      version: sourceMap.version,
      sources: sourceMap.sources,
      sourcesContent: sourceMap.sourcesContent,
      mappings: sourceMap.mappings,
      names: sourceMap.names || [],
    });

    // Split bundle into lines for efficient processing
    const bundleLines = bundleContent.split('\n');
    const lineSizes = bundleLines.map((line) => computeRawSize(line + '\n')); // Include newline

    // For each symbol, find its positions in the bundle
    for (const symbol of symbols) {
      let totalSize = 0;

      const sourceStartLine = symbol.location.start.line;
      const sourceStartCol = symbol.location.start.column;
      const sourceEndLine = symbol.location.end.line;
      const sourceEndCol = symbol.location.end.column;

      // Iterate through bundle lines and map back to source
      for (let bundleLine = 0; bundleLine < bundleLines.length; bundleLine++) {
        // Map bundle position to source position
        const original = consumer.originalPositionFor({
          line: bundleLine + 1, // 1-indexed
          column: 0,
        });

        // Check if this bundle line maps to our symbol's source location
        if (original.source && original.line !== null && original.column !== null) {
          const originalLine = original.line;
          const originalCol = original.column;

          // Check if this position is within the symbol's source range
          const isWithinSymbol =
            (originalLine === sourceStartLine &&
              originalLine === sourceEndLine &&
              originalCol >= sourceStartCol &&
              originalCol <= sourceEndCol) ||
            (originalLine === sourceStartLine &&
              originalLine < sourceEndLine &&
              originalCol >= sourceStartCol) ||
            (originalLine === sourceEndLine &&
              originalLine > sourceStartLine &&
              originalCol <= sourceEndCol) ||
            (originalLine > sourceStartLine && originalLine < sourceEndLine);

          if (isWithinSymbol) {
            // Add this line's size to the symbol
            totalSize += lineSizes[bundleLine];
          }
        }
      }

      // If we couldn't find specific mappings, estimate based on symbol.size if available
      if (totalSize === 0 && symbol.size > 0) {
        totalSize = symbol.size;
      }

      if (totalSize > 0) {
        symbolSizes.set(symbol.name, totalSize);
      }
    }

    consumer.destroy();
  } catch (error) {
    console.warn('Failed to compute symbol sizes from source map:', error);
    // Fallback: use symbol.size if available
    for (const symbol of symbols) {
      if (symbol.size > 0) {
        symbolSizes.set(symbol.name, symbol.size);
      }
    }
  }

  return symbolSizes;
}

/**
 * Aggregate chunk sizes
 * Combines multiple chunk size calculations
 * @param chunkSizes - Array of size objects for chunks
 * @returns Aggregated size information
 */
export function aggregateChunkSizes(chunkSizes: Array<{ raw: number; gzipped: number }>): {
  totalRaw: number;
  totalGzipped: number;
  chunks: Array<{ raw: number; gzipped: number }>;
} {
  const totalRaw = chunkSizes.reduce((sum, chunk) => sum + chunk.raw, 0);
  const totalGzipped = chunkSizes.reduce((sum, chunk) => sum + chunk.gzipped, 0);

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
export function aggregateBundleSizes(bundleSizes: Array<{ raw: number; gzipped: number }>): {
  totalRaw: number;
  totalGzipped: number;
  bundles: Array<{ raw: number; gzipped: number }>;
} {
  const totalRaw = bundleSizes.reduce((sum, bundle) => sum + bundle.raw, 0);
  const totalGzipped = bundleSizes.reduce((sum, bundle) => sum + bundle.gzipped, 0);

  return {
    totalRaw,
    totalGzipped,
    bundles: bundleSizes,
  };
}
