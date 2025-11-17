import { Injectable } from '@angular/core';
import { SourceMapConsumer } from '@jridgewell/source-map';
import { ChunkInfo } from '../models/bundle.models';

@Injectable({
  providedIn: 'root',
})
export class SourceMapProcessorService {
  getGeneratedLocations(
    chunks: ChunkInfo[],
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

    for (const chunk of chunks) {
      if (!chunk.sourceMap) continue;

      try {
        const consumer = new SourceMapConsumer(
          chunk.sourceMap as any,
          chunk.fileName,
        );

        consumer.eachMapping((mapping) => {
          if (
            mapping.source === sourcePath &&
            mapping.originalLine === originalLine &&
            Math.abs((mapping.originalColumn || 0) - originalColumn) <= 5
          ) {
            const snippet = this.extractGeneratedSnippet(
              chunk.content,
              mapping.generatedLine,
              mapping.generatedColumn,
            );

            results.push({
              chunkId: chunk.id,
              generatedLine: mapping.generatedLine,
              generatedColumn: mapping.generatedColumn,
              sizeImpact: 0, // Will be filled by caller
              snippet,
            });
          }
        });
      } catch (error) {
        console.warn(
          'Error processing source map for generated locations:',
          error,
        );
      }
    }

    return results;
  }

  extractInlineSourceMap(content: string): any | undefined {
    const sourceMapMatch = content.match(
      /\/\/# sourceMappingURL=data:application\/json;base64,(.+)$/m,
    );
    if (sourceMapMatch) {
      try {
        const decoded = atob(sourceMapMatch[1]);
        return JSON.parse(decoded);
      } catch {
        return undefined;
      }
    }
    return undefined;
  }

  private extractGeneratedSnippet(
    content: string,
    line: number,
    column: number,
    contextChars: number = 120,
  ): string {
    const contentWithoutSourceMap = this.getContentWithoutSourceMap(content);
    const lines = contentWithoutSourceMap.split('\n');

    if (line < 1 || line > lines.length) {
      return '';
    }

    const targetLine = lines[line - 1];
    const start = column;
    const end = Math.min(targetLine.length, column + contextChars);

    return targetLine.substring(start, end);
  }

  private getContentWithoutSourceMap(content: string): string {
    const sourceMapCommentIndex = content.lastIndexOf('//# sourceMappingURL=');
    if (sourceMapCommentIndex !== -1) {
      const beforeSourceMap = content.substring(0, sourceMapCommentIndex);
      return beforeSourceMap.trimEnd();
    }
    return content;
  }
}
