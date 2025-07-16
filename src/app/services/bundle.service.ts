import { Injectable, signal, inject } from '@angular/core';
import {
  BundleAnalysis,
  ChunkInfo,
  SourceMapData,
  SourceMapMapping,
  MappingImpact,
} from '../models/bundle.models';
import { InputBundle, InputBundleFile } from '../models/storage';
import { StorageService } from './storage.service';
import { BundleCalculationService } from './bundle-calculation.service';
import { SourceMapProcessorService } from './source-map-processor.service';

function isSourceMapFile(file: File): boolean {
  return file.name.endsWith('.map') || file.name.endsWith('.sourcemap');
}

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

    const chunkFiles = files.filter((file) => !isSourceMapFile(file));
    const sourceMapFiles = files.filter(isSourceMapFile);

    try {
      const chunks: ChunkInfo[] = [];
      const fileContents = new Map<string, string>();
      const bundleFiles: InputBundleFile[] = [];
      const existingPaths = new Set<string>();

      // Process each chunk file
      for (let i = 0; i < chunkFiles.length; i++) {
        const chunkFile = chunkFiles[i];
        const sourceMapFile = sourceMapFiles[i];

        // Read chunk content
        const chunkContent = await this.readFileAsText(chunkFile);
        const chunkStoragePath = this.storageService.createStoragePath(
          chunkFile.name,
          existingPaths,
        );
        existingPaths.add(chunkStoragePath);

        // Store chunk content
        fileContents.set(chunkStoragePath, chunkContent);
        bundleFiles.push({
          name: chunkFile.name,
          storagePath: chunkStoragePath,
        });

        // Process source map if provided
        let sourceMap: SourceMapData | undefined;
        if (sourceMapFile) {
          const sourceMapContent = await this.readFileAsText(sourceMapFile);
          const sourceMapStoragePath = this.storageService.createStoragePath(
            sourceMapFile.name,
            existingPaths,
          );
          existingPaths.add(sourceMapStoragePath);

          // Store source map content
          fileContents.set(sourceMapStoragePath, sourceMapContent);
          bundleFiles.push({
            name: sourceMapFile.name,
            storagePath: sourceMapStoragePath,
          });

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

      // Create bundle metadata
      const bundleId = this.storageService.generateBundleId();
      const bundleName = `Bundle ${new Date().toLocaleString()}`;
      const inputBundle: InputBundle = {
        id: bundleId,
        name: bundleName,
        importedAt: Date.now(),
        files: bundleFiles,
      };

      // Save to storage
      const savedBundleId = await this.storageService.storeBundleWithFiles(
        inputBundle,
        fileContents,
      );

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
