/**
 * Benchmark tests for ingestion performance
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ingestBundle } from '../../src/lib/server/ingestion/index.js';
import type { BundleIngestionInput } from '../../src/lib/server/ingestion/index.js';
import { benchmark, formatBenchmarkResult } from './utils.js';
import { createTestData, TEST_CONFIGS } from './test-data.js';
import * as schema from '../../src/lib/server/db/schema.js';
import { db } from '../../src/lib/server/db/index.js';

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
  `);

  return { db: testDb };
});

describe('Ingestion Performance Benchmarks', () => {
  beforeEach(async () => {
    // Clean up database before each test
    await db.delete(schema.sourceMapEntry).execute();
    await db.delete(schema.symbol).execute();
    await db.delete(schema.dependency).execute();
    await db.delete(schema.chunkModule).execute();
    await db.delete(schema.chunk).execute();
    await db.delete(schema.module).execute();
    await db.delete(schema.bundle).execute();
    await db.delete(schema.suggestion).execute();
    await db.delete(schema.analysisRun).execute();
  });

  describe('Small bundle (1MB)', () => {
    it('should ingest small bundle within acceptable time', async () => {
      const config = TEST_CONFIGS.small;
      const testData = createTestData(config);

      const input: BundleIngestionInput = {
        options: {
          bundlerType: 'webpack',
          projectName: 'bench-small',
          enableIncremental: false,
        },
        ...testData,
      };

      const result = await benchmark(
        'Small bundle ingestion (1MB)',
        async () => {
          const ingestionResult = await ingestBundle(input);
          expect(ingestionResult.stats.modulesWritten).toBe(config.moduleCount);
        },
        3,
      );

      console.log(formatBenchmarkResult(result));

      // Performance target: should complete in under 5 seconds for 1MB
      expect(result.duration).toBeLessThan(5000);
    }, 30000); // 30 second timeout
  });

  describe('Medium bundle (10MB)', () => {
    it('should ingest medium bundle within acceptable time', async () => {
      const config = TEST_CONFIGS.medium;
      const testData = createTestData(config);

      const input: BundleIngestionInput = {
        options: {
          bundlerType: 'webpack',
          projectName: 'bench-medium',
          enableIncremental: false,
        },
        ...testData,
      };

      const result = await benchmark(
        'Medium bundle ingestion (10MB)',
        async () => {
          const ingestionResult = await ingestBundle(input);
          expect(ingestionResult.stats.modulesWritten).toBe(config.moduleCount);
        },
        3,
      );

      console.log(formatBenchmarkResult(result));

      // Performance target: should complete in under 30 seconds for 10MB
      expect(result.duration).toBeLessThan(30000);
    }, 60000); // 60 second timeout
  });

  describe('Large bundle (50MB)', () => {
    it('should ingest large bundle within acceptable time', async () => {
      const config = TEST_CONFIGS.large;
      const testData = createTestData(config);

      const input: BundleIngestionInput = {
        options: {
          bundlerType: 'webpack',
          projectName: 'bench-large',
          enableIncremental: false,
        },
        ...testData,
      };

      const result = await benchmark(
        'Large bundle ingestion (50MB)',
        async () => {
          const ingestionResult = await ingestBundle(input);
          expect(ingestionResult.stats.modulesWritten).toBe(config.moduleCount);
        },
        2,
      ); // Fewer iterations for large bundle

      console.log(formatBenchmarkResult(result));

      // Performance target: should complete in under 3.5 minutes for 50MB
      // Note: Large bundle tests are slower in CI environments
      expect(result.duration).toBeLessThan(210000);
    }, 360000); // 6 minute timeout for large bundle (slow in CI)
  });

  describe('AST Analysis Performance', () => {
    it('should analyze modules efficiently', async () => {
      const { extractSymbols } = await import('../../src/lib/server/ingestion/ast/analyzer.js');
      const config = TEST_CONFIGS.medium;
      const testData = createTestData(config);
      const sampleModule = testData.modules[0];

      const result = await benchmark(
        'AST analysis per module',
        async () => {
          extractSymbols(sampleModule.sourceContent, {
            sourceType: 'module',
            includeNested: true,
            filePath: sampleModule.filePath,
          });
        },
        10,
      );

      console.log(formatBenchmarkResult(result));

      // Performance target: should analyze a module in under 100ms
      expect(result.duration).toBeLessThan(100);
    });
  });

  describe('Database Write Performance', () => {
    it('should write ingestion data efficiently', async () => {
      const config = TEST_CONFIGS.small;
      const testData = createTestData(config);

      const input: BundleIngestionInput = {
        options: {
          bundlerType: 'webpack',
          projectName: 'bench-db-write',
          enableIncremental: false,
        },
        ...testData,
      };

      const result = await benchmark(
        'Database write performance',
        async () => {
          await ingestBundle(input);
        },
        3,
      );

      console.log(formatBenchmarkResult(result));

      // Performance target: database writes should be fast
      expect(result.duration).toBeLessThan(5000);
    }, 30000);
  });
});
