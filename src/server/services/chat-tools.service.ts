import { serverStorageService } from '../database/storage.service.js';
import { getDatabase } from '../database/db.js';

/**
 * Chat tools service - implements tool functions that the LLM can call
 */

export interface BundleOverview {
  bundleId: string;
  bundleName: string;
  importedAt: string;
  totalSize: number;
  chunkCount: number;
  sourceFileCount: number;
  largestChunks: Array<{
    name: string;
    size: number;
    sizeFormatted: string;
  }>;
}

/**
 * Get a high-level overview of a bundle
 */
export async function getBundleOverview(
  bundleId: string,
): Promise<BundleOverview> {
  // Load bundle metadata
  const bundle = serverStorageService.loadBundleMetadata(bundleId);
  if (!bundle) {
    throw new Error(`Bundle ${bundleId} not found`);
  }

  // Load file contents to calculate sizes
  const fileContents = serverStorageService.loadAllFileContents(bundleId);

  // Separate chunks from source maps
  const chunkFiles = bundle.files.filter(
    (file) => !file.name.endsWith('.map') && !file.name.endsWith('.sourcemap'),
  );

  // Calculate chunk sizes
  const chunkSizes = chunkFiles
    .map((file) => ({
      name: file.name,
      size: fileContents.get(file.storagePath)?.length || 0,
    }))
    .sort((a, b) => b.size - a.size);

  const totalSize = chunkSizes.reduce((sum, chunk) => sum + chunk.size, 0);

  // Count source files from source_analysis table
  const db = getDatabase();
  const sourceCount = db
    .prepare('SELECT COUNT(DISTINCT file_path) as count FROM source_analysis WHERE bundle_id = ?')
    .get(bundleId) as { count: number } | undefined;

  return {
    bundleId,
    bundleName: bundle.name,
    importedAt: new Date(bundle.importedAt).toLocaleString(),
    totalSize,
    chunkCount: chunkFiles.length,
    sourceFileCount: sourceCount?.count || 0,
    largestChunks: chunkSizes.slice(0, 5).map((chunk) => ({
      name: chunk.name,
      size: chunk.size,
      sizeFormatted: formatBytes(chunk.size),
    })),
  };
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
