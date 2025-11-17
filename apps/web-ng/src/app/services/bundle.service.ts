import { inject, Injectable } from '@angular/core';
import { SourceMapConsumer } from '@jridgewell/source-map';
import {
  ChunkFragment,
  CodePosition,
  ParsedBundle,
  ParsedChunk,
  ParsedSource,
} from '../models';
import {
  BundleAnalysis,
  ChunkInfo,
  getMappingImpacts,
  SourceMapData,
} from '../models/bundle.models';
import { BundleCalculationService } from './bundle-calculation.service';
import { SourceMapProcessorService } from './source-map-processor.service';
import { inputBundleFromUpload, StorageService } from './storage.service';

@Injectable({
  providedIn: 'root',
})
export class BundleService {
  private readonly storageService = inject(StorageService);
  private readonly bundleCalculation = inject(BundleCalculationService);
  private readonly sourceMapProcessor = inject(SourceMapProcessorService);

  async storeUploadedBundle(files: File[]): Promise<string> {
    const [inputBundle, fileContents] = await inputBundleFromUpload(files);

    const savedBundleId = await this.storageService.storeBundleWithFiles(
      inputBundle,
      fileContents,
    );

    if (!savedBundleId) {
      throw new Error('Failed to save bundle to storage');
    }

    return savedBundleId;
  }

  async loadParsedBundle(bundleId: string): Promise<ParsedBundle> {
    // Load bundle metadata
    const bundleMetadata =
      await this.storageService.loadBundleMetadata(bundleId);
    if (!bundleMetadata) {
      throw new Error(`Bundle ${bundleId} not found`);
    }

    // Load all file contents
    const fileContents =
      await this.storageService.loadAllFileContents(bundleId);

    // Create index of source files (string --> index) that applies across all chunks
    const sourcesByPath = new Map<string, ParsedSource>();
    const parsedChunks: ParsedChunk[] = [];

    const chunkFiles = bundleMetadata.files.filter(
      (file) =>
        !file.name.endsWith('.map') && !file.name.endsWith('.sourcemap'),
    );

    for (const chunkFile of chunkFiles) {
      const chunkContent = fileContents.get(chunkFile.storagePath);
      if (!chunkContent) {
        console.warn(`Chunk content not found for ${chunkFile.name}`);
        continue;
      }

      // Look for corresponding source map file
      const sourceMapFile = bundleMetadata.files.find(
        (file) => file.name === `${chunkFile.name}.map`,
      );

      let sourceMap: SourceMapData | undefined;
      if (sourceMapFile) {
        const sourceMapContent = fileContents.get(sourceMapFile.storagePath);
        if (sourceMapContent) {
          sourceMap = JSON.parse(sourceMapContent) as SourceMapData;
        }
      } else {
        sourceMap =
          this.sourceMapProcessor.extractInlineSourceMap(chunkContent);
      }

      // Process each chunk to build ParsedChunk and ChunkFragment data
      const parsedChunk = this.processChunkForParsedBundle(
        chunkFile.name,
        chunkContent,
        sourceMap,
        sourcesByPath,
      );
      parsedChunks.push(parsedChunk);
    }

    // Create the final ParsedBundle object with all chunks and sources
    const sources = Array.from(sourcesByPath.values());
    const chunksByName = new Map<string, ParsedChunk>();
    parsedChunks.forEach((chunk) => chunksByName.set(chunk.name, chunk));

    return {
      id: bundleId,
      name: bundleMetadata.name,
      importedAt: bundleMetadata.importedAt,
      chunks: parsedChunks,
      sources,
      chunksByName,
      sourcesByPath,
    };
  }

  async loadStoredBundle(bundleId: string): Promise<BundleAnalysis> {
    // Load bundle metadata
    const bundleMetadata =
      await this.storageService.loadBundleMetadata(bundleId);
    if (!bundleMetadata) {
      throw new Error(`Bundle ${bundleId} not found`);
    }

    // Load all file contents
    const fileContents =
      await this.storageService.loadAllFileContents(bundleId);

    // Reconstruct chunks from stored data
    const chunks: ChunkInfo[] = [];
    const chunkFiles = bundleMetadata.files.filter(
      (file) =>
        !file.name.endsWith('.map') && !file.name.endsWith('.sourcemap'),
    );

    for (const chunkFile of chunkFiles) {
      const chunkContent = fileContents.get(chunkFile.storagePath);
      if (!chunkContent) {
        console.warn(`Chunk content not found for ${chunkFile.name}`);
        continue;
      }

      // Look for corresponding source map file
      const sourceMapFile = bundleMetadata.files.find(
        (file) => file.name === `${chunkFile.name}.map`,
      );

      let sourceMap: SourceMapData | undefined;
      if (sourceMapFile) {
        const sourceMapContent = fileContents.get(sourceMapFile.storagePath);
        if (sourceMapContent) {
          sourceMap = JSON.parse(sourceMapContent) as SourceMapData;
        }
      } else {
        sourceMap =
          this.sourceMapProcessor.extractInlineSourceMap(chunkContent);
      }

      const chunk: ChunkInfo = {
        id: chunkFile.name.replace(/\.[^/.]+$/, ''),
        fileName: chunkFile.name,
        size: chunkContent.length,
        content: chunkContent,
        sourceMap,
      };
      chunks.push(chunk);
    }

    // Analyze the reconstructed bundle
    const analysis = this.bundleCalculation.analyzeBundle(bundleId, chunks);

    return analysis;
  }

  /**
   * Get generated code locations for a specific source position
   */
  getGeneratedLocations(
    bundle: BundleAnalysis,
    sourcePath: string,
    originalLine: number,
    originalColumn: number,
  ): Array<{
    chunkId: string;
    generatedLine: number;
    generatedColumn: number;
    sizeImpact: number;
    snippet: string;
  }> {
    const results: Array<{
      chunkId: string;
      generatedLine: number;
      generatedColumn: number;
      sizeImpact: number;
      snippet: string;
    }> = [];

    const locations = this.sourceMapProcessor.getGeneratedLocations(
      bundle.chunks,
      sourcePath,
      originalLine,
      originalColumn,
    );

    const mappingImpacts = getMappingImpacts(bundle, sourcePath);
    for (const location of locations) {
      const impact = mappingImpacts.find(
        (impact) =>
          impact.originalLine === originalLine &&
          Math.abs(impact.originalColumn - originalColumn) <= 5,
      );
      results.push({
        ...location,
        sizeImpact: impact?.sizeImpact || 0,
      });
    }

    return results;
  }

  private processChunkForParsedBundle(
    fileName: string,
    content: string,
    sourceMap: SourceMapData | undefined,
    sourcesByPath: Map<string, ParsedSource>,
  ): ParsedChunk {
    const chunkId = fileName.replace(/\.[^/.]+$/, '');
    const fragments: ChunkFragment[] = [];

    if (sourceMap) {
      try {
        const consumer = new SourceMapConsumer(sourceMap as any, fileName);
        const contentWithoutSourceMap =
          this.getContentWithoutSourceMap(content);
        const lines = contentWithoutSourceMap.split('\n');

        const mappings: any[] = [];
        consumer.eachMapping((mapping: any) => {
          mappings.push(mapping);
        });

        // Sort mappings by generated position
        mappings.sort((a, b) => {
          if (a.generatedLine !== b.generatedLine) {
            return a.generatedLine - b.generatedLine;
          }
          return a.generatedColumn - b.generatedColumn;
        });

        // Process mappings into fragments
        for (let i = 0; i < mappings.length; i++) {
          const currentMapping = mappings[i];
          const nextMapping = mappings[i + 1];

          if (!currentMapping.source) continue;

          // Ensure source exists in sources map
          let parsedSource = sourcesByPath.get(currentMapping.source);
          if (!parsedSource) {
            const sourceIndex = sourceMap.sources.indexOf(
              currentMapping.source,
            );
            const sourceContent =
              sourceMap.sourcesContent?.[sourceIndex] || undefined;
            parsedSource = {
              path: currentMapping.source,
              content: sourceContent,
              referencingChunks: new Set([chunkId]),
            };
            sourcesByPath.set(currentMapping.source, parsedSource);
          } else {
            parsedSource.referencingChunks.add(chunkId);
          }

          // Calculate fragment bounds
          const generatedStart: CodePosition = {
            line: currentMapping.generatedLine,
            column: currentMapping.generatedColumn,
          };

          let generatedEnd: CodePosition;
          let size = 0;

          if (nextMapping) {
            generatedEnd = {
              line: nextMapping.generatedLine,
              column: nextMapping.generatedColumn,
            };
            size = this.calculateBytesBetweenPositions(
              generatedStart,
              generatedEnd,
              lines,
            );
          } else {
            // Last mapping - goes to end of content
            generatedEnd = {
              line: lines.length,
              column: lines[lines.length - 1]?.length || 0,
            };
            size = this.calculateBytesToEnd(generatedStart, lines);
          }

          const fragment: ChunkFragment = {
            chunkId,
            generatedStart,
            generatedEnd,
            size,
            sourceId: sourceMap.sources.indexOf(currentMapping.source),
            sourcePosition:
              currentMapping.originalLine &&
              currentMapping.originalColumn !== undefined
                ? {
                    line: currentMapping.originalLine,
                    column: currentMapping.originalColumn,
                  }
                : undefined,
            name: currentMapping.name,
          };

          fragments.push(fragment);
        }
      } catch (error) {
        console.warn(
          'Error processing source map for parsed chunk:',
          fileName,
          error,
        );
        // Fall back to single fragment for entire chunk
        fragments.push({
          chunkId,
          generatedStart: { line: 1, column: 0 },
          generatedEnd: { line: content.split('\n').length, column: 0 },
          size: content.length,
        });
      }
    } else {
      // No source map - create single fragment for entire chunk
      const lines = content.split('\n');
      fragments.push({
        chunkId,
        generatedStart: { line: 1, column: 0 },
        generatedEnd: {
          line: lines.length,
          column: lines[lines.length - 1]?.length || 0,
        },
        size: content.length,
      });
    }

    return {
      id: chunkId,
      name: fileName,
      size: content.length,
      content,
      fragments,
    };
  }

  private getContentWithoutSourceMap(content: string): string {
    const sourceMapCommentIndex = content.lastIndexOf('//# sourceMappingURL=');
    if (sourceMapCommentIndex !== -1) {
      const beforeSourceMap = content.substring(0, sourceMapCommentIndex);
      return beforeSourceMap.trimEnd();
    }
    return content;
  }

  private calculateBytesBetweenPositions(
    start: CodePosition,
    end: CodePosition,
    lines: string[],
  ): number {
    let bytes = 0;

    if (start.line === end.line) {
      bytes = Math.max(0, end.column - start.column);
    } else {
      // Rest of start line
      if (start.line - 1 < lines.length) {
        bytes += Math.max(0, lines[start.line - 1].length - start.column);
        bytes += 1; // newline
      }

      // Full lines in between
      for (
        let line = start.line;
        line < end.line - 1 && line < lines.length;
        line++
      ) {
        bytes += lines[line].length + 1; // +1 for newline
      }

      // Beginning of end line
      if (end.line - 1 < lines.length) {
        bytes += Math.max(0, end.column);
      }
    }

    return bytes;
  }

  private calculateBytesToEnd(start: CodePosition, lines: string[]): number {
    let bytes = 0;

    // Rest of start line
    if (start.line - 1 < lines.length) {
      bytes += Math.max(0, lines[start.line - 1].length - start.column);
      bytes += 1; // newline
    }

    // All remaining lines
    for (let i = start.line; i < lines.length; i++) {
      bytes += lines[i].length + 1; // +1 for newline
    }

    // Remove final newline if we added one
    if (bytes > 0) {
      bytes -= 1;
    }

    return Math.max(0, bytes);
  }
}
