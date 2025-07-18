import { inject, Injectable } from '@angular/core';
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
        (file) =>
          file.name === `${chunkFile.name}.map`
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
}
