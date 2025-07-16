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
  totalSize: number;
  chunks: ChunkInfo[];
  sourceBreakdown: Map<string, number>;
  mappingImpacts: Map<string, MappingImpact[]>; // source path -> mapping impacts
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
