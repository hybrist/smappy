/**
 * Source map processing module
 * Handles parsing and processing of JavaScript source maps
 */

import type { SourceMap } from '../types/index.js';

/**
 * Parse a source map from JSON string
 * @param sourceMapContent - Source map JSON content
 * @returns Parsed source map object
 * @deprecated Use parseSourceMap from processor.ts for enhanced functionality
 */
export function parseSourceMap(sourceMapContent: string): SourceMap {
  const parsed = JSON.parse(sourceMapContent);
  return {
    version: parsed.version,
    sources: parsed.sources || [],
    sourcesContent: parsed.sourcesContent,
    mappings: parsed.mappings,
    names: parsed.names,
  };
}

/**
 * Validate a source map structure
 * @param sourceMap - Source map to validate
 * @returns true if valid, false otherwise
 */
export function validateSourceMap(sourceMap: SourceMap): boolean {
  return (
    sourceMap.version === 3 &&
    Array.isArray(sourceMap.sources) &&
    typeof sourceMap.mappings === 'string'
  );
}

// Re-export all processor functions and types
export {
  parseSourceMap as parseSourceMapAdvanced,
  mapBundleToSource,
  computeSymbolFragments,
  computeSymbolFragmentsWithContent,
  loadExternalSourceMap,
  type Position,
  type PositionMapping,
  type SymbolFragment,
} from './processor.js';
