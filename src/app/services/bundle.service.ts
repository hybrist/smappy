import { Injectable, signal, inject } from '@angular/core';
import {
  BundleAnalysis,
  BundleConfig,
  ChunkInfo,
  SourceMapData,
  SourceMapMapping,
  MappingImpact,
} from '../models/bundle.models';
import { StorageService } from './storage.service';
import { BundleCalculationService } from './bundle-calculation.service';
import { SourceMapProcessorService } from './source-map-processor.service';

@Injectable({
  providedIn: 'root',
})
export class BundleService {
  private readonly storageService = inject(StorageService);
  private readonly bundleCalculation = inject(BundleCalculationService);
  private readonly sourceMapProcessor = inject(SourceMapProcessorService);

  private readonly currentBundle = signal<BundleAnalysis | null>(null);
  private readonly isLoading = signal<boolean>(false);
  private readonly error = signal<string | null>(null);

  readonly bundle = this.currentBundle.asReadonly();
  readonly loading = this.isLoading.asReadonly();
  readonly errorMessage = this.error.asReadonly();

  constructor() {
    // Try to restore bundle from file system on initialization
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

      const analysis = await this.bundleCalculation.analyzeBundle(chunks);
      this.currentBundle.set(analysis);

      // Save to file system for persistence
      await this.storageService.saveBundleAnalysis(analysis);
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
      sourceMap = this.sourceMapProcessor.extractInlineSourceMap(content);
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
      if (
        sourceIndex !== undefined &&
        chunk.sourceMap.sourcesContent[sourceIndex]
      ) {
        return chunk.sourceMap.sourcesContent[sourceIndex];
      }
    }

    return null;
  }

  async reset(): Promise<void> {
    this.currentBundle.set(null);
    this.error.set(null);
    this.isLoading.set(false);

    // Clear from file system
    await this.storageService.clearBundleAnalysis();
  }

  private async restoreBundleFromStorage(): Promise<void> {
    try {
      const savedBundle = await this.storageService.loadBundleAnalysis();
      if (savedBundle) {
        this.currentBundle.set(savedBundle);
      }
    } catch (error) {
      console.warn('Failed to restore bundle from storage:', error);
      await this.storageService.clearBundleAnalysis();
    }
  }

  async hasSavedBundle(): Promise<boolean> {
    return await this.storageService.hasSavedBundleAnalysis();
  }

  async getBundleAge(): Promise<number | null> {
    return await this.storageService.getBundleAnalysisAge();
  }

  /**
   * Get precomputed mapping impacts for a source file
   */
  getMappingImpacts(sourcePath: string): MappingImpact[] {
    const bundle = this.currentBundle();
    return bundle?.mappingImpacts.get(sourcePath) || [];
  }

  /**
   * Get generated code locations for a specific source position
   */
  getGeneratedLocations(
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
    const bundle = this.currentBundle();
    if (!bundle) return [];

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

    const mappingImpacts = this.getMappingImpacts(sourcePath);
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
}
