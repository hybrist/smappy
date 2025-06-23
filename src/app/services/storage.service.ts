import { Injectable } from '@angular/core';
import { SourceMapConsumer } from '@jridgewell/source-map';
import {
  BundleAnalysis,
  SerializableBundleAnalysis,
  ChunkInfo,
  MappingImpact,
} from '../models/bundle.models';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private readonly BUNDLE_KEY = 'smappy_bundle_analysis';
  private readonly BUNDLE_TIMESTAMP_KEY = 'smappy_bundle_timestamp';
  private readonly MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

  saveBundleAnalysis(analysis: BundleAnalysis): void {
    try {
      const serializable: SerializableBundleAnalysis = {
        totalSize: analysis.totalSize,
        chunks: analysis.chunks,
        sourceBreakdown: Array.from(analysis.sourceBreakdown.entries()),
      };

      localStorage.setItem(this.BUNDLE_KEY, JSON.stringify(serializable));
      localStorage.setItem(this.BUNDLE_TIMESTAMP_KEY, Date.now().toString());
    } catch (error) {
      console.warn('Failed to save bundle analysis to localStorage:', error);
    }
  }

  loadBundleAnalysis(): BundleAnalysis | null {
    try {
      const timestampStr = localStorage.getItem(this.BUNDLE_TIMESTAMP_KEY);
      if (!timestampStr) return null;

      const timestamp = parseInt(timestampStr, 10);
      const age = Date.now() - timestamp;

      // Check if data is too old
      if (age > this.MAX_AGE_MS) {
        this.clearBundleAnalysis();
        return null;
      }

      const dataStr = localStorage.getItem(this.BUNDLE_KEY);
      if (!dataStr) return null;

      const serializable: SerializableBundleAnalysis = JSON.parse(dataStr);

      return {
        totalSize: serializable.totalSize,
        chunks: serializable.chunks,
        sourceBreakdown: new Map(serializable.sourceBreakdown),
        mappingImpacts: this.recalculateMappingImpacts(serializable.chunks),
      };
    } catch (error) {
      console.warn('Failed to load bundle analysis from localStorage:', error);
      this.clearBundleAnalysis();
      return null;
    }
  }

  clearBundleAnalysis(): void {
    try {
      localStorage.removeItem(this.BUNDLE_KEY);
      localStorage.removeItem(this.BUNDLE_TIMESTAMP_KEY);
    } catch (error) {
      console.warn('Failed to clear bundle analysis from localStorage:', error);
    }
  }

  hasSavedBundleAnalysis(): boolean {
    const timestampStr = localStorage.getItem(this.BUNDLE_TIMESTAMP_KEY);
    if (!timestampStr) return false;

    const timestamp = parseInt(timestampStr, 10);
    const age = Date.now() - timestamp;

    return age <= this.MAX_AGE_MS && !!localStorage.getItem(this.BUNDLE_KEY);
  }

  getBundleAnalysisAge(): number | null {
    const timestampStr = localStorage.getItem(this.BUNDLE_TIMESTAMP_KEY);
    if (!timestampStr) return null;

    const timestamp = parseInt(timestampStr, 10);
    return Date.now() - timestamp;
  }

  /**
   * Recalculate mapping impacts from chunk data when loading from storage
   */
  private recalculateMappingImpacts(chunks: ChunkInfo[]): Map<string, MappingImpact[]> {
    const mappingImpacts = new Map<string, MappingImpact[]>();

    function addMappingImpact(source: string, impact: MappingImpact) {
      const impacts = mappingImpacts.get(source) || [];
      impacts.push(impact);
      mappingImpacts.set(source, impacts);
    }

    for (const chunk of chunks) {
      if (!chunk.sourceMap) continue;

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
            // Store mapping impact for later reuse
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
      } catch (error) {
        console.warn(
          'Error processing source map for chunk',
          chunk.fileName,
          error,
        );
        // Skip this chunk if source map processing fails
      }
    }

    return mappingImpacts;
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
}
