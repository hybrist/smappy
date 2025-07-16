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

/**
 * Position within source code (1-based line numbers, 0-based columns)
 */
export interface CodePosition {
  line: number;
  column: number;
}

/**
 * Individual mappable unit within a chunk
 * Represents a contiguous piece of generated code that can be traced back to source
 */
export interface ChunkFragment {
  /** ID of the chunk this fragment belongs to */
  chunkId: string;
  /** Starting position in generated code */
  generatedStart: CodePosition;
  /** Ending position in generated code */
  generatedEnd: CodePosition;
  /** Size in bytes of this fragment */
  size: number;
  /** Path to the original source file */
  sourcePath?: string;
  /** Position in original source code */
  sourcePosition?: CodePosition;
  /** Optional symbol name from source map */
  name?: string;
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
