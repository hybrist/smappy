/**
 * Stress tests for extremely large bundles (>100MB)
 * Validates system handles large bundles without crashing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ingestBundle, type BundleIngestionInput } from '../../src/lib/server/ingestion/index.js';
import type {
  BundleInput,
  ModuleInput,
  ChunkInput,
  IngestionOptions,
} from '../../src/lib/server/ingestion/types/index.js';
import { process } from 'node:process';

// Mock the db module to use test database
vi.mock('../../src/lib/server/db/index.js', async () => {
  const Database = (await import('better-sqlite3')).default;
  const { drizzle } = await import('drizzle-orm/better-sqlite3');
  const schema = await import('../../src/lib/server/db/schema.js');

  const testClient = new Database(':memory:');
  const testDb = drizzle(testClient, { schema });

  // Create schema
  testClient.exec(`
    CREATE TABLE AnalysisRun (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_name TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      bundler TEXT
    );

    CREATE TABLE Bundle (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      analysis_run_id INTEGER NOT NULL REFERENCES AnalysisRun(id) ON DELETE CASCADE,
      file_name TEXT NOT NULL,
      file_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      gzip_size INTEGER
    );

    CREATE TABLE Chunk (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      analysis_run_id INTEGER NOT NULL REFERENCES AnalysisRun(id) ON DELETE CASCADE,
      name TEXT,
      total_size INTEGER NOT NULL,
      is_entry INTEGER NOT NULL DEFAULT 0,
      is_async INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE Module (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      analysis_run_id INTEGER NOT NULL REFERENCES AnalysisRun(id) ON DELETE CASCADE,
      file_path TEXT NOT NULL,
      file_type TEXT NOT NULL,
      original_size INTEGER NOT NULL,
      bundled_size INTEGER NOT NULL,
      is_third_party INTEGER NOT NULL DEFAULT 0,
      package_name TEXT,
      package_version TEXT,
      exports TEXT,
      used_exports TEXT,
      UNIQUE(analysis_run_id, file_path)
    );

    CREATE TABLE Dependency (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      analysis_run_id INTEGER NOT NULL REFERENCES AnalysisRun(id) ON DELETE CASCADE,
      importer_module_id INTEGER NOT NULL REFERENCES Module(id) ON DELETE CASCADE,
      imported_module_id INTEGER NOT NULL REFERENCES Module(id) ON DELETE CASCADE,
      import_type TEXT NOT NULL,
      imported_symbols TEXT
    );

    CREATE TABLE Symbol (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module_id INTEGER NOT NULL REFERENCES Module(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      source_start_line INTEGER NOT NULL,
      source_start_col INTEGER NOT NULL,
      source_end_line INTEGER NOT NULL,
      source_end_col INTEGER NOT NULL,
      ast_hash TEXT,
      is_exported INTEGER NOT NULL DEFAULT 0,
      computed_bundled_size INTEGER NOT NULL DEFAULT 0,
      computed_gzip_size INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE SourceMapEntry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bundle_id INTEGER NOT NULL REFERENCES Bundle(id) ON DELETE CASCADE,
      symbol_id INTEGER NOT NULL REFERENCES Symbol(id) ON DELETE CASCADE,
      byte_length INTEGER NOT NULL
    );

    CREATE TABLE Suggestion (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      analysis_run_id INTEGER NOT NULL REFERENCES AnalysisRun(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      severity TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL
    );

    CREATE TABLE Chunk_Module (
      chunk_id INTEGER NOT NULL REFERENCES Chunk(id) ON DELETE CASCADE,
      module_id INTEGER NOT NULL REFERENCES Module(id) ON DELETE CASCADE,
      PRIMARY KEY (chunk_id, module_id)
    );

    CREATE TABLE Suggestion_Link (
      suggestion_id INTEGER NOT NULL REFERENCES Suggestion(id) ON DELETE CASCADE,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      PRIMARY KEY (suggestion_id, entity_type, entity_id)
    );
  `);

  return { db: testDb };
});

// Import after mocking
const { db } = await import('../../src/lib/server/db/index.js');
const schema = await import('../../src/lib/server/db/schema.js');

beforeEach(async () => {
  // Clear all tables before each test
  await db.delete(schema.suggestionLink);
  await db.delete(schema.chunkModule);
  await db.delete(schema.suggestion);
  await db.delete(schema.sourceMapEntry);
  await db.delete(schema.symbol);
  await db.delete(schema.dependency);
  await db.delete(schema.module);
  await db.delete(schema.chunk);
  await db.delete(schema.bundle);
  await db.delete(schema.analysisRun);
});

/**
 * Helper to get memory usage in MB
 */
function getMemoryUsageMB(): number {
  if (typeof process === 'undefined' || !process.memoryUsage) {
    return 0; // Fallback if process is not available
  }
  const usage = process.memoryUsage();
  return Math.round(usage.heapUsed / 1024 / 1024);
}

/**
 * Generate a large bundle content (>100MB)
 */
function generateLargeBundle(sizeMB: number): string {
  // Generate content that's approximately sizeMB in size
  // Using a pattern that compresses well for gzip testing
  const chunk = 'export const data = ' + JSON.stringify({ data: 'x'.repeat(1000) }) + ';\n';
  const chunkSize = chunk.length;
  const chunksNeeded = Math.ceil((sizeMB * 1024 * 1024) / chunkSize);

  const chunks: string[] = [];
  for (let i = 0; i < chunksNeeded; i++) {
    chunks.push(chunk.replace('data', `data${i}`));
  }

  return chunks.join('\n');
}

describe('Large Bundle Stress Tests', () => {
  const timeout = parseInt(
    typeof process !== 'undefined' && process.env?.STRESS_TEST_TIMEOUT
      ? process.env.STRESS_TEST_TIMEOUT
      : '300000',
    10,
  );

  it(
    'should handle 100MB+ bundle without crashing',
    async () => {
      const initialMemory = getMemoryUsageMB();

      // Create a 110MB bundle (slightly over 100MB threshold)
      const bundleSizeMB = 110;
      const largeBundleContent = generateLargeBundle(bundleSizeMB);

      expect(largeBundleContent.length).toBeGreaterThan(100 * 1024 * 1024);

      const options: IngestionOptions = {
        bundlerType: 'vite',
        projectName: 'stress-test-large-bundle',
        enableIncremental: false,
      };

      const bundles: BundleInput[] = [
        {
          fileName: 'large-bundle.js',
          content: largeBundleContent,
          type: 'js',
        },
      ];

      const modules: ModuleInput[] = [
        {
          filePath: './src/index.js',
          sourceContent: 'export const main = () => console.log("Hello");',
          fileType: 'js',
        },
      ];

      const chunks: ChunkInput[] = [
        {
          name: 'main',
          isEntry: true,
          isAsync: false,
          moduleIds: ['./src/index.js'],
        },
      ];

      const input: BundleIngestionInput = {
        options,
        bundles,
        modules,
        chunks,
      };

      // Should not throw
      const result = await ingestBundle(input);

      // Verify ingestion completed
      expect(result.analysisRunId).toBeGreaterThan(0);
      expect(result.stats.bundlesWritten).toBe(1);
      expect(result.stats.bundlesWritten).toBeGreaterThan(0);

      // Verify bundle size was recorded correctly
      const bundlesFromDb = await db.select().from(schema.bundle).execute();
      expect(bundlesFromDb).toHaveLength(1);
      expect(bundlesFromDb[0]!.size).toBeGreaterThan(100 * 1024 * 1024);

      // Memory should not have grown excessively
      const finalMemory = getMemoryUsageMB();
      const memoryIncrease = finalMemory - initialMemory;

      // Allow up to 512MB increase for processing (bundle + processing overhead)
      expect(memoryIncrease).toBeLessThan(512);
    },
    timeout,
  );

  it(
    'should handle 200MB bundle with graceful degradation',
    async () => {
      const initialMemory = getMemoryUsageMB();

      // Create a 200MB bundle
      const bundleSizeMB = 200;
      const largeBundleContent = generateLargeBundle(bundleSizeMB);

      const options: IngestionOptions = {
        bundlerType: 'vite',
        projectName: 'stress-test-very-large-bundle',
        enableIncremental: false,
      };

      const bundles: BundleInput[] = [
        {
          fileName: 'very-large-bundle.js',
          content: largeBundleContent,
          type: 'js',
        },
      ];

      const modules: ModuleInput[] = [
        {
          filePath: './src/index.js',
          sourceContent: 'export const main = () => console.log("Hello");',
          fileType: 'js',
        },
      ];

      const chunks: ChunkInput[] = [
        {
          name: 'main',
          isEntry: true,
          isAsync: false,
          moduleIds: ['./src/index.js'],
        },
      ];

      const input: BundleIngestionInput = {
        options,
        bundles,
        modules,
        chunks,
      };

      // Should complete successfully or fail gracefully
      try {
        const result = await ingestBundle(input);

        // If successful, verify it worked
        expect(result.analysisRunId).toBeGreaterThan(0);
        expect(result.stats.bundlesWritten).toBe(1);
      } catch (error) {
        // If it fails, ensure it's a meaningful error message
        expect(error).toBeInstanceOf(Error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        expect(errorMessage).toBeTruthy();

        // Should not crash silently
        expect(errorMessage.length).toBeGreaterThan(0);
      }

      // Memory should not have grown excessively
      const finalMemory = getMemoryUsageMB();
      const memoryIncrease = finalMemory - initialMemory;

      // Allow up to 1GB increase for very large bundles
      expect(memoryIncrease).toBeLessThan(1024);
    },
    timeout,
  );

  it(
    'should compute gzip sizes for large bundles',
    async () => {
      // Create a 50MB bundle (smaller for faster test)
      const bundleSizeMB = 50;
      const largeBundleContent = generateLargeBundle(bundleSizeMB);

      const options: IngestionOptions = {
        bundlerType: 'vite',
        projectName: 'stress-test-gzip-large',
        enableIncremental: false,
      };

      const bundles: BundleInput[] = [
        {
          fileName: 'large-bundle.js',
          content: largeBundleContent,
          type: 'js',
        },
      ];

      const modules: ModuleInput[] = [
        {
          filePath: './src/index.js',
          sourceContent: 'export const main = () => console.log("Hello");',
          fileType: 'js',
        },
      ];

      const chunks: ChunkInput[] = [
        {
          name: 'main',
          isEntry: true,
          isAsync: false,
          moduleIds: ['./src/index.js'],
        },
      ];

      const input: BundleIngestionInput = {
        options,
        bundles,
        modules,
        chunks,
      };

      const result = await ingestBundle(input);

      // Verify gzip size was computed
      const bundlesFromDb = await db.select().from(schema.bundle).execute();
      expect(bundlesFromDb).toHaveLength(1);
      expect(bundlesFromDb[0]!.gzipSize).toBeGreaterThan(0);
      expect(bundlesFromDb[0]!.gzipSize).toBeLessThan(bundlesFromDb[0]!.size); // Gzip should compress

      // No errors should occur
      expect(result.errors).toEqual([]);
    },
    timeout,
  );
});
