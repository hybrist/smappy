import { inject, Injectable, signal } from '@angular/core';
import {
  BundleAnalysis,
  ChunkInfo,
  MappingImpact,
  SourceMapData,
  SourceMapMapping,
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

  private readonly currentBundle = signal<BundleAnalysis | null>(null);
  private readonly currentBundleId = signal<string | null>(null);
  private readonly isLoading = signal<boolean>(false);
  private readonly error = signal<string | null>(null);

  readonly bundle = this.currentBundle.asReadonly();
  readonly bundleId = this.currentBundleId.asReadonly();
  readonly loading = this.isLoading.asReadonly();
  readonly errorMessage = this.error.asReadonly();

  async loadBundle(files: File[]): Promise<string | null> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const [inputBundle, fileContents] = await inputBundleFromUpload(files);

      // Save to storage
      const savedBundleId = await this.storageService.storeBundleWithFiles(
        inputBundle,
        fileContents,
      );

      const chunks: ChunkInfo[] = [];

      // Process each chunk file
      for (const file of inputBundle.files) {
        // Only look at JavaScript and CSS files for chunks.
        if (!/\.[mc]?js$/.test(file.name) && !file.name.endsWith('.css')) {
          continue;
        }

        const chunkFile = file;
        const chunkContent = fileContents.get(chunkFile.storagePath)!;

        // Process source map if provided
        let sourceMap: SourceMapData | undefined;

        // TODO: Properly handle source map URL comments.
        const sourceMapFile = inputBundle.files.find(
          (f) => f.name === `${chunkFile.name}.map`,
        );
        if (sourceMapFile) {
          const sourceMapContent = fileContents.get(sourceMapFile.storagePath)!;
          sourceMap = JSON.parse(sourceMapContent) as SourceMapData;
        } else {
          sourceMap =
            this.sourceMapProcessor.extractInlineSourceMap(chunkContent);
        }

        // Create chunk info
        const chunk: ChunkInfo = {
          id: chunkFile.name.replace(/\.[^/.]+$/, ''),
          fileName: chunkFile.name,
          size: chunkContent.length,
          content: chunkContent,
          sourceMap,
        };
        chunks.push(chunk);
      }

      // Analyze the bundle
      const analysis = await this.bundleCalculation.analyzeBundle(chunks);
      this.currentBundle.set(analysis);

      if (savedBundleId) {
        this.currentBundleId.set(savedBundleId);
        return savedBundleId;
      } else {
        throw new Error('Failed to save bundle to storage');
      }
    } catch (err) {
      this.error.set(
        err instanceof Error ? err.message : 'Failed to load bundle',
      );
      return null;
    } finally {
      this.isLoading.set(false);
    }
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
    this.currentBundleId.set(null);
    this.error.set(null);
    this.isLoading.set(false);

    // Clear from file system
    await this.storageService.clearAllData();
  }

  async hasSavedBundle(): Promise<boolean> {
    const bundles = await this.storageService.listAllBundles();
    return bundles.length > 0;
  }

  async loadStoredBundle(bundleId: string): Promise<void> {
    try {
      this.isLoading.set(true);
      this.error.set(null);

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
          (file) =>
            file.name === `${chunkFile.name}.map` ||
            file.name.endsWith('.map') ||
            file.name.endsWith('.sourcemap'),
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
      const analysis = await this.bundleCalculation.analyzeBundle(chunks);
      this.currentBundle.set(analysis);
      this.currentBundleId.set(bundleId);
    } catch (error) {
      this.error.set(
        error instanceof Error ? error.message : 'Failed to load bundle',
      );
      console.warn('Failed to load stored bundle:', error);
    } finally {
      this.isLoading.set(false);
    }
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
