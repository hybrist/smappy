import { Injectable, signal } from '@angular/core';
import {
  BundleAnalysis,
  BundleConfig,
  ChunkInfo,
  SourceMapData,
  SourceMapMapping,
} from '../models/bundle.models';

@Injectable({
  providedIn: 'root',
})
export class BundleService {
  private readonly currentBundle = signal<BundleAnalysis | null>(null);
  private readonly isLoading = signal<boolean>(false);
  private readonly error = signal<string | null>(null);

  readonly bundle = this.currentBundle.asReadonly();
  readonly loading = this.isLoading.asReadonly();
  readonly errorMessage = this.error.asReadonly();

  async loadBundle(config: BundleConfig): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const chunks: ChunkInfo[] = [];

      for (let i = 0; i < config.chunks.length; i++) {
        const chunkFile = config.chunks[i];
        const sourceMapFile = config.sourceMaps?.[i];

        const chunk = await this.processChunk(chunkFile, sourceMapFile);
        chunks.push(chunk);
      }

      const analysis = this.analyzeBundle(chunks);
      this.currentBundle.set(analysis);
    } catch (err) {
      this.error.set(
        err instanceof Error ? err.message : 'Failed to load bundle'
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  private async processChunk(
    chunkFile: File,
    sourceMapFile?: File
  ): Promise<ChunkInfo> {
    const content = await this.readFileAsText(chunkFile);
    let sourceMap: SourceMapData | undefined;

    if (sourceMapFile) {
      const sourceMapContent = await this.readFileAsText(sourceMapFile);
      sourceMap = JSON.parse(sourceMapContent) as SourceMapData;
    } else {
      // Try to extract inline source map
      sourceMap = this.extractInlineSourceMap(content);
    }

    return {
      id: chunkFile.name.replace(/\.[^/.]+$/, ''),
      fileName: chunkFile.name,
      size: content.length,
      content,
      sourceMap,
    };
  }

  private async readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () =>
        reject(new Error(`Failed to read file: ${file.name}`));
      reader.readAsText(file);
    });
  }

  private extractInlineSourceMap(content: string): SourceMapData | undefined {
    const sourceMapMatch = content.match(
      /\/\/# sourceMappingURL=data:application\/json;base64,(.+)$/m
    );
    if (sourceMapMatch) {
      try {
        const decoded = atob(sourceMapMatch[1]);
        return JSON.parse(decoded) as SourceMapData;
      } catch {
        return undefined;
      }
    }
    return undefined;
  }

  private analyzeBundle(chunks: ChunkInfo[]): BundleAnalysis {
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
    const sourceBreakdown = new Map<string, number>();

    for (const chunk of chunks) {
      if (chunk.sourceMap) {
        for (const source of chunk.sourceMap.sources) {
          const currentSize = sourceBreakdown.get(source) || 0;
          sourceBreakdown.set(
            source,
            currentSize + chunk.size / chunk.sourceMap.sources.length
          );
        }
      }
    }

    return {
      totalSize,
      chunks,
      sourceBreakdown,
    };
  }

  getChunkById(id: string): ChunkInfo | undefined {
    return this.currentBundle()?.chunks.find((chunk) => chunk.id === id);
  }

  getChunksBySource(sourcePath: string): ChunkInfo[] {
    const bundle = this.currentBundle();
    if (!bundle) return [];

    const chunks: ChunkInfo[] = [];
    for (const chunk of bundle.chunks) {
      if (chunk.sourceMap?.sources.includes(sourcePath)) {
        chunks.push(chunk);
      }
    }
    return chunks;
  }

  getSourceMapMappings(chunkId: string): SourceMapMapping[] {
    const chunk = this.getChunkById(chunkId);
    if (!chunk?.sourceMap) return [];

    // This would need a full source map parsing library like 'source-map'
    // For now, return empty array - implementation would decode the mappings string
    return [];
  }

  reset(): void {
    this.currentBundle.set(null);
    this.error.set(null);
    this.isLoading.set(false);
  }
}
