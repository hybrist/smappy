/**
 * Parsed Data Model for Bundle Analysis
 * 
 * This module defines the structured, immutable representation of bundle data
 * that serves as the bridge between raw storage and computed analysis.
 * 
 * The parsed data is designed to be:
 * - Read-optimized with fast lookup structures
 * - Memory efficient with minimal duplication
 * - Long-lived (stays in memory for entire session)
 * - Fragment-based for granular analysis
 */

import { z } from 'zod';

/**
 * Position within source code (1-based line numbers, 0-based columns)
 */
export interface CodePosition {
  line: number;
  column: number;
}

/**
 * Source mapping information linking generated code to original source
 */
export interface SourceMapping {
  /** Path to the original source file */
  sourcePath: string;
  /** Position in original source code */
  originalStart: CodePosition;
  /** End position in original source (optional, for ranges) */
  originalEnd?: CodePosition;
  /** Optional symbol name from source map */
  name?: string;
}

/**
 * Individual mappable unit within a chunk
 * Represents a contiguous piece of generated code that can be traced back to source
 */
export interface ChunkFragment {
  /** Unique identifier for this fragment */
  id: string;
  /** ID of the chunk this fragment belongs to */
  chunkId: string;
  /** Starting position in generated code */
  generatedStart: CodePosition;
  /** Ending position in generated code */
  generatedEnd: CodePosition;
  /** Size in bytes of this fragment */
  size: number;
  /** Source mapping information (if available) */
  sourceMapping?: SourceMapping;
}

/**
 * Processed source map mapping entry
 */
export interface SourceMapMapping {
  /** Position in generated code */
  generated: CodePosition;
  /** Position in original source (if mapped) */
  original?: CodePosition;
  /** Source file path (if mapped) */
  source?: string;
  /** Symbol name (if available) */
  name?: string;
}

/**
 * Parsed and processed source map data
 */
export interface ParsedSourceMap {
  /** List of source file paths */
  sources: string[];
  /** List of symbol names */
  names: string[];
  /** Pre-processed mappings for efficient lookup */
  mappings: SourceMapMapping[];
}

/**
 * Individual chunk with its content and mappings
 */
export interface ParsedChunk {
  /** Unique identifier for this chunk */
  id: string;
  /** Original filename */
  name: string;
  /** Size in bytes */
  size: number;
  /** Generated code content */
  content: string;
  /** Parsed source map (if available) */
  sourceMap?: ParsedSourceMap;
  /** Fragments within this chunk */
  fragments: ChunkFragment[];
}

/**
 * Source file representation
 */
export interface ParsedSource {
  /** Source file path */
  path: string;
  /** Original source content (from sourcesContent if available) */
  content?: string;
  /** Set of chunk IDs that reference this source */
  referencingChunks: Set<string>;
}

/**
 * Main bundle container with structured data and lookup tables
 */
export interface ParsedBundle {
  /** Unique bundle identifier */
  id: string;
  /** Human-readable bundle name */
  name: string;
  /** Timestamp when bundle was imported */
  importedAt: number;
  /** All chunks in this bundle */
  chunks: ParsedChunk[];
  /** All source files referenced by this bundle */
  sources: ParsedSource[];
  /** Fast lookup table: chunk name -> chunk */
  chunksByName: Map<string, ParsedChunk>;
  /** Fast lookup table: source path -> source */
  sourcesByPath: Map<string, ParsedSource>;
}

// Validation Schemas

/**
 * Zod schema for validating code positions
 */
export const CodePositionSchema = z.object({
  line: z.number().int().min(1),
  column: z.number().int().min(0)
});

/**
 * Zod schema for validating source mappings
 */
export const SourceMappingSchema = z.object({
  sourcePath: z.string().min(1),
  originalStart: CodePositionSchema,
  originalEnd: CodePositionSchema.optional(),
  name: z.string().optional()
});

/**
 * Zod schema for validating chunk fragments
 */
export const ChunkFragmentSchema = z.object({
  id: z.string().min(1),
  chunkId: z.string().min(1),
  generatedStart: CodePositionSchema,
  generatedEnd: CodePositionSchema,
  size: z.number().int().min(0),
  sourceMapping: SourceMappingSchema.optional()
});

/**
 * Zod schema for validating source map mappings
 */
export const SourceMapMappingSchema = z.object({
  generated: CodePositionSchema,
  original: CodePositionSchema.optional(),
  source: z.string().optional(),
  name: z.string().optional()
});

/**
 * Zod schema for validating parsed source maps
 */
export const ParsedSourceMapSchema = z.object({
  sources: z.array(z.string()),
  names: z.array(z.string()),
  mappings: z.array(SourceMapMappingSchema)
});

/**
 * Zod schema for validating parsed chunks
 */
export const ParsedChunkSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  size: z.number().int().min(0),
  content: z.string(),
  sourceMap: ParsedSourceMapSchema.optional(),
  fragments: z.array(ChunkFragmentSchema)
});

/**
 * Zod schema for validating parsed sources
 */
export const ParsedSourceSchema = z.object({
  path: z.string().min(1),
  content: z.string().optional(),
  referencingChunks: z.set(z.string())
});

/**
 * Zod schema for validating parsed bundles
 */
export const ParsedBundleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  importedAt: z.number().int().positive(),
  chunks: z.array(ParsedChunkSchema),
  sources: z.array(ParsedSourceSchema),
  chunksByName: z.map(z.string(), ParsedChunkSchema),
  sourcesByPath: z.map(z.string(), ParsedSourceSchema)
});

// Validation Functions

/**
 * Validates a code position and returns the validated object
 */
export function validateCodePosition(position: unknown): CodePosition {
  return CodePositionSchema.parse(position);
}

/**
 * Validates a source mapping and returns the validated object
 */
export function validateSourceMapping(mapping: unknown): SourceMapping {
  return SourceMappingSchema.parse(mapping);
}

/**
 * Validates a chunk fragment and returns the validated object
 */
export function validateChunkFragment(fragment: unknown): ChunkFragment {
  return ChunkFragmentSchema.parse(fragment);
}

/**
 * Validates a parsed chunk and returns the validated object
 */
export function validateParsedChunk(chunk: unknown): ParsedChunk {
  return ParsedChunkSchema.parse(chunk);
}

/**
 * Validates a parsed source and returns the validated object
 */
export function validateParsedSource(source: unknown): ParsedSource {
  return ParsedSourceSchema.parse(source);
}

/**
 * Validates a parsed bundle and returns the validated object
 */
export function validateParsedBundle(bundle: unknown): ParsedBundle {
  return ParsedBundleSchema.parse(bundle);
}

// Helper Functions

/**
 * Creates a new parsed bundle with empty lookup tables
 */
export function createParsedBundle(
  id: string,
  name: string,
  importedAt: number,
  chunks: ParsedChunk[] = [],
  sources: ParsedSource[] = []
): ParsedBundle {
  const chunksByName = new Map<string, ParsedChunk>();
  const sourcesByPath = new Map<string, ParsedSource>();

  // Populate lookup tables
  chunks.forEach(chunk => {
    chunksByName.set(chunk.name, chunk);
  });

  sources.forEach(source => {
    sourcesByPath.set(source.path, source);
  });

  return {
    id,
    name,
    importedAt,
    chunks,
    sources,
    chunksByName,
    sourcesByPath
  };
}

/**
 * Creates a new parsed source with empty referencing chunks set
 */
export function createParsedSource(
  path: string,
  content?: string,
  referencingChunks: string[] = []
): ParsedSource {
  return {
    path,
    content,
    referencingChunks: new Set(referencingChunks)
  };
}

/**
 * Generates a unique fragment ID based on chunk and position
 */
export function generateFragmentId(
  chunkId: string,
  generatedStart: CodePosition
): string {
  return `${chunkId}:${generatedStart.line}:${generatedStart.column}`;
}