export interface SourceMapMapping {
  generatedLine: number;
  generatedColumn: number;
  originalLine?: number;
  originalColumn?: number;
  source?: string;
  name?: string;
}

export interface SourceMapData {
  version: number;
  readonly sources: readonly (string | null)[];
  readonly sourcesContent?: readonly (string | null)[];
  readonly names: readonly string[];
  mappings: string;
  file?: string | null;
  sourceRoot?: string;
}

export interface ChunkInfo {
  id: string;
  fileName: string;
  size: number;
  content: string;
  sourceMap?: SourceMapData;
}

export interface FunctionInfo {
  name: string;
  startLine: number;
  endLine: number;
  size: number;
  originalLocation?: {
    source: string;
    line: number;
    column: number;
  };
}

export interface MappingImpact {
  chunkId: string;
  originalLine: number;
  originalColumn: number;
  sizeImpact: number;
}

export interface BundleAnalysis {
  bundleId: string;
  totalSize: number;
  chunks: ChunkInfo[];
  sourceBreakdown: Map<string, number>;
  mappingImpacts: Map<string, MappingImpact[]>; // source path -> mapping impacts
}

export function getMappingImpacts(
  bundle: BundleAnalysis,
  sourcePath: string,
): MappingImpact[] {
  return bundle.mappingImpacts.get(sourcePath) || [];
}

export function getChunksBySource(
  bundle: BundleAnalysis,
  sourcePath: string,
): ChunkInfo[] {
  const chunks: ChunkInfo[] = [];
  for (const chunk of bundle.chunks) {
    if (chunk.sourceMap?.sources.includes(sourcePath)) {
      chunks.push(chunk);
    }
  }
  return chunks;
}

export function getSourceContent(
  bundle: BundleAnalysis,
  sourcePath: string,
): string | null {
  for (const chunk of bundle.chunks) {
    if (!chunk.sourceMap || !chunk.sourceMap.sourcesContent) continue;

    let sourceIndex = chunk.sourceMap.sources.indexOf(sourcePath);
    if (
      sourceIndex !== undefined &&
      chunk.sourceMap.sourcesContent[sourceIndex]
    ) {
      return chunk.sourceMap.sourcesContent[sourceIndex];
    }
  }

  return null;
}

// Serializable version for localStorage
export interface SerializableBundleAnalysis {
  totalSize: number;
  chunks: ChunkInfo[];
  sourceBreakdown: [string, number][];
}

export interface SerializableChunkInfo {
  id: string;
  fileName: string;
  size: number;
  content: string;
  sourceMap?: SourceMapData;
}

/**
 * Chunk graph data model for visualizing import relationships
 */
export interface ChunkGraph {
  /** List of chunk nodes with metadata */
  nodes: ChunkGraphNode[];
  /** List of edges representing import relationships */
  edges: ChunkGraphEdge[];
}

/**
 * Node in the chunk import graph
 */
export interface ChunkGraphNode {
  /** Chunk ID */
  id: string;
  /** Chunk file name */
  fileName: string;
  /** Chunk size in bytes */
  size: number;
  /** Number of chunks this chunk imports */
  importCount: number;
  /** Number of chunks that import this chunk */
  dependentCount: number;
}

/**
 * Edge in the chunk import graph representing an import relationship
 */
export interface ChunkGraphEdge {
  /** Source chunk ID (the chunk that imports) */
  source: string;
  /** Target chunk ID (the chunk being imported) */
  target: string;
  /** Type of import (static or dynamic) */
  type: 'static' | 'dynamic';
}
