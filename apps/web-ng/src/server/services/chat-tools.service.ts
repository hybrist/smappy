import { getDatabase } from '../database/db.js';
import { serverStorageService } from '../database/storage.service.js';

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
    .prepare(
      'SELECT COUNT(DISTINCT file_path) as count FROM source_analysis WHERE bundle_id = ?',
    )
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

export interface ChunkInfo {
  name: string;
  size: number;
  sizeFormatted: string;
}

/**
 * List all chunks in a bundle with their sizes
 */
export async function listBundleChunks(
  bundleId: string,
  sortBy: 'size' | 'name' = 'size',
): Promise<ChunkInfo[]> {
  const bundle = serverStorageService.loadBundleMetadata(bundleId);
  if (!bundle) {
    throw new Error(`Bundle ${bundleId} not found`);
  }

  const fileContents = serverStorageService.loadAllFileContents(bundleId);

  const chunkFiles = bundle.files.filter(
    (file) => !file.name.endsWith('.map') && !file.name.endsWith('.sourcemap'),
  );

  const chunks = chunkFiles.map((file) => ({
    name: file.name,
    size: fileContents.get(file.storagePath)?.length || 0,
    sizeFormatted: formatBytes(fileContents.get(file.storagePath)?.length || 0),
  }));

  if (sortBy === 'size') {
    chunks.sort((a, b) => b.size - a.size);
  } else {
    chunks.sort((a, b) => a.name.localeCompare(b.name));
  }

  return chunks;
}

export interface ChunkDetails {
  name: string;
  size: number;
  sizeFormatted: string;
  sourceFiles: string[];
  sourceFileCount: number;
}

/**
 * Get detailed information about a specific chunk
 */
export async function getChunkDetails(
  bundleId: string,
  chunkName: string,
): Promise<ChunkDetails> {
  const bundle = serverStorageService.loadBundleMetadata(bundleId);
  if (!bundle) {
    throw new Error(`Bundle ${bundleId} not found`);
  }

  const fileContents = serverStorageService.loadAllFileContents(bundleId);
  const chunkFile = bundle.files.find((f) => f.name === chunkName);

  if (!chunkFile) {
    throw new Error(`Chunk ${chunkName} not found in bundle`);
  }

  const chunkContent = fileContents.get(chunkFile.storagePath);
  const size = chunkContent?.length || 0;

  // Try to find source map for this chunk
  const sourceMapFile = bundle.files.find((f) => f.name === `${chunkName}.map`);

  let sourceFiles: string[] = [];
  if (sourceMapFile) {
    const sourceMapContent = fileContents.get(sourceMapFile.storagePath);
    if (sourceMapContent) {
      try {
        const sourceMap = JSON.parse(sourceMapContent);
        sourceFiles = (sourceMap.sources || []).filter(
          (s: string | null) => s !== null,
        );
      } catch (error) {
        console.warn(`Failed to parse source map for ${chunkName}`);
      }
    }
  }

  return {
    name: chunkName,
    size,
    sizeFormatted: formatBytes(size),
    sourceFiles,
    sourceFileCount: sourceFiles.length,
  };
}

export interface SourceFileInfo {
  path: string;
  totalSize: number;
  sizeFormatted: string;
}

/**
 * List all source files in the bundle
 */
export async function listSourceFiles(
  bundleId: string,
  sortBy: 'size' | 'name' = 'size',
): Promise<SourceFileInfo[]> {
  const db = getDatabase();

  // Get all source files from source_analysis table
  const rows = db
    .prepare(
      'SELECT DISTINCT file_path FROM source_analysis WHERE bundle_id = ?',
    )
    .all(bundleId) as { file_path: string }[];

  const sourceFiles: SourceFileInfo[] = rows.map((row) => ({
    path: row.file_path,
    totalSize: 0, // We'll estimate from fragments
    sizeFormatted: '~',
  }));

  // For each source file, sum up fragment sizes to estimate total impact
  for (const sourceFile of sourceFiles) {
    const fragmentsRow = db
      .prepare(
        'SELECT fragments FROM source_analysis WHERE bundle_id = ? AND file_path = ?',
      )
      .get(bundleId, sourceFile.path) as { fragments: string } | undefined;

    if (fragmentsRow) {
      try {
        const fragments = JSON.parse(fragmentsRow.fragments);
        const totalSize = fragments.reduce(
          (sum: number, f: any) => sum + (f.sourceSize || 0),
          0,
        );
        sourceFile.totalSize = totalSize;
        sourceFile.sizeFormatted = formatBytes(totalSize);
      } catch (error) {
        console.warn(`Failed to parse fragments for ${sourceFile.path}`);
      }
    }
  }

  if (sortBy === 'size') {
    sourceFiles.sort((a, b) => b.totalSize - a.totalSize);
  } else {
    sourceFiles.sort((a, b) => a.path.localeCompare(b.path));
  }

  return sourceFiles;
}

export interface SourceFragment {
  name: string;
  type: string;
  startLine: number;
  endLine: number;
  sourceSize: number;
  sizeFormatted: string;
}

export interface SourceFileAnalysis {
  filePath: string;
  totalFragments: number;
  fragments: SourceFragment[];
}

/**
 * Get source code analysis for a specific file
 */
export async function getSourceFileAnalysis(
  bundleId: string,
  filePath: string,
): Promise<SourceFileAnalysis> {
  const db = getDatabase();

  const row = db
    .prepare(
      'SELECT fragments FROM source_analysis WHERE bundle_id = ? AND file_path = ?',
    )
    .get(bundleId, filePath) as { fragments: string } | undefined;

  if (!row) {
    throw new Error(`Source analysis not found for ${filePath}`);
  }

  const fragmentsData = JSON.parse(row.fragments);

  const fragments: SourceFragment[] = fragmentsData.map((f: any) => ({
    name: f.name,
    type: f.type,
    startLine: f.startLine,
    endLine: f.endLine,
    sourceSize: f.sourceSize || 0,
    sizeFormatted: formatBytes(f.sourceSize || 0),
  }));

  return {
    filePath,
    totalFragments: fragments.length,
    fragments,
  };
}

export interface FragmentSearchResult {
  filePath: string;
  fragmentName: string;
  type: string;
  startLine: number;
  endLine: number;
  sourceSize: number;
  sizeFormatted: string;
}

/**
 * Search for fragments (functions, classes, etc.) across all source files
 */
export async function findFragment(
  bundleId: string,
  searchTerm: string,
): Promise<FragmentSearchResult[]> {
  const db = getDatabase();

  const rows = db
    .prepare(
      'SELECT file_path, fragments FROM source_analysis WHERE bundle_id = ?',
    )
    .all(bundleId) as { file_path: string; fragments: string }[];

  const results: FragmentSearchResult[] = [];
  const searchLower = searchTerm.toLowerCase();

  for (const row of rows) {
    try {
      const fragments = JSON.parse(row.fragments);

      for (const fragment of fragments) {
        if (!fragment.name) {
          continue;
        }
        if (fragment.name.toLowerCase().includes(searchLower)) {
          results.push({
            filePath: row.file_path,
            fragmentName: fragment.name,
            type: fragment.type,
            startLine: fragment.startLine,
            endLine: fragment.endLine,
            sourceSize: fragment.sourceSize || 0,
            sizeFormatted: formatBytes(fragment.sourceSize || 0),
          });
        }
      }
    } catch (error) {
      console.warn(`Failed to parse fragments for ${row.file_path}`, error);
    }
  }

  // Sort by size descending
  results.sort((a, b) => b.sourceSize - a.sourceSize);

  return results;
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
