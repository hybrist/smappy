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
  private readonly STORAGE_DIRECTORY = 'smappy';
  private readonly MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
  private directoryHandle: FileSystemDirectoryHandle | null = null;

  async saveBundleAnalysis(analysis: BundleAnalysis): Promise<string | null> {
    try {
      const serializable: SerializableBundleAnalysis = {
        totalSize: analysis.totalSize,
        chunks: analysis.chunks,
        sourceBreakdown: Array.from(analysis.sourceBreakdown.entries()),
      };

      const timestamp = Date.now();
      const filename = `bundle-${timestamp}.json`;

      const directoryHandle = await this.getDirectoryHandle();
      const fileHandle = await directoryHandle.getFileHandle(filename, {
        create: true,
      });
      const writable = await fileHandle.createWritable();

      await writable.write(JSON.stringify(serializable));
      await writable.close();

      return filename;
    } catch (error) {
      console.warn('Failed to save bundle analysis to file system:', error);
      return null;
    }
  }

  async loadBundleAnalysis(): Promise<BundleAnalysis | null> {
    try {
      const files = await this.listBundleAnalyses();
      if (files.length === 0) return null;

      // Get the most recent file
      const latestFile = files[files.length - 1];
      const age = Date.now() - latestFile.timestamp;

      // Check if data is too old
      if (age > this.MAX_AGE_MS) {
        await this.clearBundleAnalysis();
        return null;
      }

      const directoryHandle = await this.getDirectoryHandle();
      const fileHandle = await directoryHandle.getFileHandle(
        latestFile.filename,
      );
      const file = await fileHandle.getFile();
      const dataStr = await file.text();

      const serializable: SerializableBundleAnalysis = JSON.parse(dataStr);

      return {
        totalSize: serializable.totalSize,
        chunks: serializable.chunks,
        sourceBreakdown: new Map(serializable.sourceBreakdown),
        mappingImpacts: this.recalculateMappingImpacts(serializable.chunks),
      };
    } catch (error) {
      console.warn('Failed to load bundle analysis from file system:', error);
      await this.clearBundleAnalysis();
      return null;
    }
  }

  async clearBundleAnalysis(): Promise<void> {
    try {
      const directoryHandle = await this.getDirectoryHandle();
      const files = await this.listBundleAnalyses();

      for (const file of files) {
        await directoryHandle.removeEntry(file.filename);
      }
    } catch (error) {
      console.warn('Failed to clear bundle analysis from file system:', error);
    }
  }

  async hasSavedBundleAnalysis(): Promise<boolean> {
    try {
      const files = await this.listBundleAnalyses();
      if (files.length === 0) return false;

      const latestFile = files[files.length - 1];
      const age = Date.now() - latestFile.timestamp;

      return age <= this.MAX_AGE_MS;
    } catch (error) {
      console.warn('Failed to check for saved bundle analysis:', error);
      return false;
    }
  }

  async getBundleAnalysisAge(): Promise<number | null> {
    try {
      const files = await this.listBundleAnalyses();
      if (files.length === 0) return null;

      const latestFile = files[files.length - 1];
      return Date.now() - latestFile.timestamp;
    } catch (error) {
      console.warn('Failed to get bundle analysis age:', error);
      return null;
    }
  }

  private async getDirectoryHandle(): Promise<FileSystemDirectoryHandle> {
    if (!this.directoryHandle) {
      const opfsRoot = await navigator.storage.getDirectory();
      this.directoryHandle = await opfsRoot.getDirectoryHandle(
        this.STORAGE_DIRECTORY,
        { create: true },
      );
    }
    return this.directoryHandle;
  }

  private async listBundleAnalyses(): Promise<
    { filename: string; timestamp: number }[]
  > {
    try {
      const directoryHandle = await this.getDirectoryHandle();
      const files: { filename: string; timestamp: number }[] = [];

      for await (const [name, handle] of directoryHandle.entries()) {
        if (
          handle.kind === 'file' &&
          name.startsWith('bundle-') &&
          name.endsWith('.json')
        ) {
          const timestampStr = name.replace('bundle-', '').replace('.json', '');
          const timestamp = parseInt(timestampStr, 10);
          if (!isNaN(timestamp)) {
            files.push({ filename: name, timestamp });
          }
        }
      }

      return files.sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      console.warn('Failed to list bundle analyses:', error);
      return [];
    }
  }

  async getAllBundleAnalyses(): Promise<
    { filename: string; timestamp: number; age: number }[]
  > {
    try {
      const files = await this.listBundleAnalyses();
      const now = Date.now();

      return files.map((file) => ({
        ...file,
        age: now - file.timestamp,
      }));
    } catch (error) {
      console.warn('Failed to get all bundle analyses:', error);
      return [];
    }
  }

  async deleteBundleAnalysis(filename: string): Promise<void> {
    try {
      const directoryHandle = await this.getDirectoryHandle();
      await directoryHandle.removeEntry(filename);
    } catch (error) {
      console.warn('Failed to delete bundle analysis:', error);
    }
  }

  async cleanupOldAnalyses(): Promise<void> {
    try {
      const files = await this.listBundleAnalyses();
      const now = Date.now();

      for (const file of files) {
        const age = now - file.timestamp;
        if (age > this.MAX_AGE_MS) {
          await this.deleteBundleAnalysis(file.filename);
        }
      }
    } catch (error) {
      console.warn('Failed to cleanup old analyses:', error);
    }
  }

  async loadBundleAnalysisByFilename(
    filename: string,
  ): Promise<BundleAnalysis | null> {
    try {
      const directoryHandle = await this.getDirectoryHandle();
      const fileHandle = await directoryHandle.getFileHandle(filename);
      const file = await fileHandle.getFile();
      const dataStr = await file.text();

      const serializable: SerializableBundleAnalysis = JSON.parse(dataStr);

      return {
        totalSize: serializable.totalSize,
        chunks: serializable.chunks,
        sourceBreakdown: new Map(serializable.sourceBreakdown),
        mappingImpacts: this.recalculateMappingImpacts(serializable.chunks),
      };
    } catch (error) {
      console.warn('Failed to load bundle analysis by filename:', error);
      return null;
    }
  }

  /**
   * Recalculate mapping impacts from chunk data when loading from storage
   */
  private recalculateMappingImpacts(
    chunks: ChunkInfo[],
  ): Map<string, MappingImpact[]> {
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
