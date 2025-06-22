import { Injectable, signal, inject } from '@angular/core';
import { SourceMapConsumer } from '@jridgewell/source-map';
import {
  BundleAnalysis,
  BundleConfig,
  ChunkInfo,
  SourceMapData,
  SourceMapMapping,
} from '../models/bundle.models';
import { StorageService } from './storage.service';
import { of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class BundleService {
  private readonly storageService = inject(StorageService);

  private readonly currentBundle = signal<BundleAnalysis | null>(null);
  private readonly isLoading = signal<boolean>(false);
  private readonly error = signal<string | null>(null);

  readonly bundle = this.currentBundle.asReadonly();
  readonly loading = this.isLoading.asReadonly();
  readonly errorMessage = this.error.asReadonly();

  constructor() {
    // Try to restore bundle from localStorage on initialization
    this.restoreBundleFromStorage();
  }

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

      // Save to localStorage for persistence
      this.storageService.saveBundleAnalysis(analysis);
    } catch (err) {
      this.error.set(
        err instanceof Error ? err.message : 'Failed to load bundle',
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  private async processChunk(
    chunkFile: File,
    sourceMapFile?: File,
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
      /\/\/# sourceMappingURL=data:application\/json;base64,(.+)$/m,
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

    function addSourceSize(source: string, size: number) {
      const currentSize = sourceBreakdown.get(source) || 0;
      sourceBreakdown.set(source, currentSize + size);
    }

    for (const chunk of chunks) {
      if (chunk.sourceMap) {
        try {
          const consumer = new SourceMapConsumer(
            chunk.sourceMap as any,
            chunk.fileName,
          );

          // Calculate the actual content size (excluding source map comment)
          const contentWithoutSourceMap = this.getContentWithoutSourceMap(
            chunk.content,
          );
          const lines = contentWithoutSourceMap.split('\n');
          const lineLengths = lines.map((line) => line.length);

          // Collect all mappings and sort by generated position
          const mappings: any[] = [];
          consumer.eachMapping((mapping) => {
            mappings.push(mapping);
          });

          // Sort mappings by generated line and column
          mappings.sort((a, b) => {
            if (a.generatedLine !== b.generatedLine) {
              return a.generatedLine - b.generatedLine;
            }
            return a.generatedColumn - b.generatedColumn;
          });

          // Calculate bytes between mappings
          for (let i = 0; i < mappings.length; i++) {
            const currentMapping = mappings[i];
            const nextMapping = mappings[i + 1];

            if (!currentMapping.source) continue;

            let bytesToAttribute = 0;

            if (nextMapping) {
              // Calculate bytes between current and next mapping
              bytesToAttribute = this.calculateBytesBetweenMappings(
                currentMapping,
                nextMapping,
                lineLengths,
              );
            } else {
              // For the last mapping, calculate bytes to end of content
              bytesToAttribute = this.calculateBytesToEnd(
                currentMapping,
                lineLengths,
              );
            }

            if (bytesToAttribute > 0) {
              addSourceSize(currentMapping.source, bytesToAttribute);
            }
          }

          // If no mappings found, attribute entire content to unknown source
          if (mappings.length === 0) {
            addSourceSize('<unknown>', contentWithoutSourceMap.length);
          }
        } catch (error) {
          console.warn(
            'Error processing source map for chunk',
            chunk.fileName,
            error,
          );
          // If source map processing fails, attribute entire chunk to unknown source
          addSourceSize('<unknown>', chunk.size);
        }
      } else {
        // No source map available, attribute entire chunk to unknown source
        addSourceSize('<unknown>', chunk.size);
      }
    }

    return {
      totalSize,
      chunks,
      sourceBreakdown,
    };
  }

  private getContentWithoutSourceMap(content: string): string {
    // Find and remove the source map comment and everything after it
    const sourceMapCommentIndex = content.lastIndexOf('//# sourceMappingURL=');
    if (sourceMapCommentIndex !== -1) {
      // Find the line before the source map comment
      const beforeSourceMap = content.substring(0, sourceMapCommentIndex);
      // Remove trailing whitespace/newlines
      return beforeSourceMap.trimEnd();
    }
    return content;
  }

  private calculateBytesBetweenMappings(
    current: any,
    next: any,
    lineLengths: number[],
  ): number {
    let bytes = 0;

    const currentLine = current.generatedLine - 1; // Convert to 0-based
    const currentColumn = current.generatedColumn;
    const nextLine = next.generatedLine - 1; // Convert to 0-based
    const nextColumn = next.generatedColumn;

    if (currentLine === nextLine) {
      // Same line - just count columns
      bytes = Math.max(0, nextColumn - currentColumn);
    } else {
      // Different lines
      // Add remaining characters on current line
      if (currentLine < lineLengths.length) {
        bytes += Math.max(0, lineLengths[currentLine] - currentColumn);
        bytes += 1; // Add newline character
      }

      // Add complete lines in between
      for (
        let line = currentLine + 1;
        line < nextLine && line < lineLengths.length;
        line++
      ) {
        bytes += lineLengths[line] + 1; // +1 for newline
      }

      // Add characters on next line up to next column
      if (nextLine < lineLengths.length) {
        bytes += Math.max(0, nextColumn);
      }
    }

    return bytes;
  }

  private calculateBytesToEnd(mapping: any, lineLengths: number[]): number {
    let bytes = 0;

    const line = mapping.generatedLine - 1; // Convert to 0-based
    const column = mapping.generatedColumn;

    // Add remaining characters on current line
    if (line < lineLengths.length) {
      bytes += Math.max(0, lineLengths[line] - column);
      bytes += 1; // Add newline character
    }

    // Add all remaining complete lines
    for (let i = line + 1; i < lineLengths.length; i++) {
      bytes += lineLengths[i] + 1; // +1 for newline
    }

    // Remove the last newline if we added one
    if (bytes > 0) {
      bytes -= 1;
    }

    return Math.max(0, bytes);
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

  getSourceContent(sourcePath: string): string | null {
    const bundle = this.currentBundle();
    if (!bundle) return null;

    for (const chunk of bundle.chunks) {
      if (!chunk.sourceMap || !chunk.sourceMap.sourcesContent) continue;

      let sourceIndex = chunk.sourceMap.sources.indexOf(sourcePath);
      if (sourceIndex !== undefined && chunk.sourceMap.sourcesContent[sourceIndex]) {
        return chunk.sourceMap.sourcesContent[sourceIndex];
      }
    }

    return null;
  }

  reset(): void {
    this.currentBundle.set(null);
    this.error.set(null);
    this.isLoading.set(false);

    // Clear from localStorage
    this.storageService.clearBundleAnalysis();
  }

  private restoreBundleFromStorage(): void {
    try {
      const savedBundle = this.storageService.loadBundleAnalysis();
      if (savedBundle) {
        this.currentBundle.set(savedBundle);
      }
    } catch (error) {
      console.warn('Failed to restore bundle from storage:', error);
      this.storageService.clearBundleAnalysis();
    }
  }

  hasSavedBundle(): boolean {
    return this.storageService.hasSavedBundleAnalysis();
  }

  getBundleAge(): number | null {
    return this.storageService.getBundleAnalysisAge();
  }
}
