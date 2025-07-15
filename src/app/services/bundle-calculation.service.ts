import { Injectable } from '@angular/core';
import { SourceMapConsumer } from '@jridgewell/source-map';
import {
  BundleAnalysis,
  ChunkInfo,
  MappingImpact,
} from '../models/bundle.models';

@Injectable({
  providedIn: 'root',
})
export class BundleCalculationService {
  analyzeBundle(chunks: ChunkInfo[]): BundleAnalysis {
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
    const sourceBreakdown = new Map<string, number>();
    const mappingImpacts = new Map<string, MappingImpact[]>();

    function addSourceSize(source: string, size: number) {
      const currentSize = sourceBreakdown.get(source) || 0;
      sourceBreakdown.set(source, currentSize + size);
    }

    function addMappingImpact(source: string, impact: MappingImpact) {
      const impacts = mappingImpacts.get(source) || [];
      impacts.push(impact);
      mappingImpacts.set(source, impacts);
    }

    chunks.forEach(async (chunk) => {
      if (chunk.sourceMap) {
        this.processChunkWithSourceMap(
          chunk,
          addSourceSize,
          addMappingImpact,
        );
      } else {
        addSourceSize('<unknown>', chunk.size);
      }
    });

    return {
      totalSize,
      chunks,
      sourceBreakdown,
      mappingImpacts,
    };
  }

  private processChunkWithSourceMap(
    chunk: ChunkInfo,
    addSourceSize: (source: string, size: number) => void,
    addMappingImpact: (source: string, impact: MappingImpact) => void,
  ): void {
    try {
      const consumer = new SourceMapConsumer(
        chunk.sourceMap as any,
        chunk.fileName,
      );

      const contentWithoutSourceMap = this.getContentWithoutSourceMap(
        chunk.content,
      );
      const lines = contentWithoutSourceMap.split('\n');
      const lineLengths = lines.map((line) => line.length);

      const mappings: any[] = [];
      consumer.eachMapping((mapping: any) => {
        mappings.push(mapping);
      });

      mappings.sort((a, b) => {
        if (a.generatedLine !== b.generatedLine) {
          return a.generatedLine - b.generatedLine;
        }
        return a.generatedColumn - b.generatedColumn;
      });

      for (let i = 0; i < mappings.length; i++) {
        const currentMapping = mappings[i];
        const nextMapping = mappings[i + 1];

        if (!currentMapping.source) continue;

        let bytesToAttribute = 0;

        if (nextMapping) {
          bytesToAttribute = this.calculateBytesBetweenMappings(
            currentMapping,
            nextMapping,
            lineLengths,
          );
        } else {
          bytesToAttribute = this.calculateBytesToEnd(
            currentMapping,
            lineLengths,
          );
        }

        if (bytesToAttribute > 0) {
          addSourceSize(currentMapping.source, bytesToAttribute);

          if (
            currentMapping.originalLine &&
            currentMapping.originalColumn !== undefined
          ) {
            addMappingImpact(currentMapping.source, {
              chunkId: chunk.id,
              originalLine: currentMapping.originalLine,
              originalColumn: currentMapping.originalColumn,
              sizeImpact: bytesToAttribute,
            });
          }
        }
      }

      if (mappings.length === 0) {
        addSourceSize('<unknown>', contentWithoutSourceMap.length);
      }
    } catch (error) {
      console.warn(
        'Error processing source map for chunk',
        chunk.fileName,
        error,
      );
      addSourceSize('<unknown>', chunk.size);
    }
  }

  private getContentWithoutSourceMap(content: string): string {
    const sourceMapCommentIndex = content.lastIndexOf('//# sourceMappingURL=');
    if (sourceMapCommentIndex !== -1) {
      const beforeSourceMap = content.substring(0, sourceMapCommentIndex);
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

    const currentLine = current.generatedLine - 1;
    const currentColumn = current.generatedColumn;
    const nextLine = next.generatedLine - 1;
    const nextColumn = next.generatedColumn;

    if (currentLine === nextLine) {
      bytes = Math.max(0, nextColumn - currentColumn);
    } else {
      if (currentLine < lineLengths.length) {
        bytes += Math.max(0, lineLengths[currentLine] - currentColumn);
        bytes += 1;
      }

      for (
        let line = currentLine + 1;
        line < nextLine && line < lineLengths.length;
        line++
      ) {
        bytes += lineLengths[line] + 1;
      }

      if (nextLine < lineLengths.length) {
        bytes += Math.max(0, nextColumn);
      }
    }

    return bytes;
  }

  private calculateBytesToEnd(mapping: any, lineLengths: number[]): number {
    let bytes = 0;

    const line = mapping.generatedLine - 1;
    const column = mapping.generatedColumn;

    if (line < lineLengths.length) {
      bytes += Math.max(0, lineLengths[line] - column);
      bytes += 1;
    }

    for (let i = line + 1; i < lineLengths.length; i++) {
      bytes += lineLengths[i] + 1;
    }

    if (bytes > 0) {
      bytes -= 1;
    }

    return Math.max(0, bytes);
  }
}
