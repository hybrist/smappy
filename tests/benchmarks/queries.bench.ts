/**
 * Benchmark tests for query performance
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import {
  getLatestAnalysis,
  getAnalysisById,
  getModulesByAnalysis,
  getSymbolsByModule,
  getDependencyGraph,
  compareAnalyses,
  getAnalysisHistory,
} from '../../src/lib/server/query/index.js';
import { ingestBundle, type BundleIngestionInput } from '../../src/lib/server/ingestion/index.js';
import { benchmark, formatBenchmarkResult } from './utils.js';
import { createTestData, TEST_CONFIGS } from './test-data.js';
import * as schema from '../../src/lib/server/db/schema.js';
import { db } from '../../src/lib/server/db/index.js';
import { eq } from 'drizzle-orm';

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

describe('Query Performance Benchmarks', () => {
  let smallRunId: number;
  let mediumRunId: number;
  let largeRunId: number;
  let mediumModuleIds: number[];

  beforeAll(async () => {
    // Setup test data for query benchmarks
    console.log('Setting up test data for query benchmarks...');

    // Small dataset
    const smallConfig = TEST_CONFIGS.small;
    const smallData = createTestData(smallConfig);
    const smallInput: BundleIngestionInput = {
      options: {
        bundlerType: 'webpack',
        projectName: 'query-bench-small',
        enableIncremental: false,
      },
      ...smallData,
    };
    const smallResult = await ingestBundle(smallInput);
    smallRunId = smallResult.analysisRunId;

    // Medium dataset
    const mediumConfig = TEST_CONFIGS.medium;
    const mediumData = createTestData(mediumConfig);
    const mediumInput: BundleIngestionInput = {
      options: {
        bundlerType: 'webpack',
        projectName: 'query-bench-medium',
        enableIncremental: false,
      },
      ...mediumData,
    };
    const mediumResult = await ingestBundle(mediumInput);
    mediumRunId = mediumResult.analysisRunId;

    // Get module IDs for medium dataset
    const mediumModules = await db
      .select({ id: schema.module.id })
      .from(schema.module)
      .where(eq(schema.module.analysisRunId, mediumRunId))
      .limit(10);
    mediumModuleIds = mediumModules.map((m) => m.id);

    // Large dataset
    const largeConfig = TEST_CONFIGS.large;
    const largeData = createTestData(largeConfig);
    const largeInput: BundleIngestionInput = {
      options: {
        bundlerType: 'webpack',
        projectName: 'query-bench-large',
        enableIncremental: false,
      },
      ...largeData,
    };
    const largeResult = await ingestBundle(largeInput);
    largeRunId = largeResult.analysisRunId;

    console.log('Test data setup complete');
  }, 300000); // 5 minute timeout for setup

  describe('getLatestAnalysis', () => {
    it('should retrieve latest analysis quickly for small dataset', async () => {
      const result = await benchmark(
        'getLatestAnalysis (small)',
        async () => {
          const analysis = await getLatestAnalysis('query-bench-small');
          expect(analysis).not.toBeNull();
          expect(analysis?.id).toBe(smallRunId);
        },
        10,
      );

      console.log(formatBenchmarkResult(result));
      expect(result.duration).toBeLessThan(100);
    });

    it('should retrieve latest analysis quickly for large dataset', async () => {
      const result = await benchmark(
        'getLatestAnalysis (large)',
        async () => {
          const analysis = await getLatestAnalysis('query-bench-large');
          expect(analysis).not.toBeNull();
          expect(analysis?.id).toBe(largeRunId);
        },
        10,
      );

      console.log(formatBenchmarkResult(result));
      expect(result.duration).toBeLessThan(200);
    });
  });

  describe('getAnalysisById', () => {
    it('should retrieve analysis by ID quickly', async () => {
      const result = await benchmark(
        'getAnalysisById',
        async () => {
          const analysis = await getAnalysisById(mediumRunId);
          expect(analysis).not.toBeNull();
          expect(analysis?.id).toBe(mediumRunId);
        },
        10,
      );

      console.log(formatBenchmarkResult(result));
      expect(result.duration).toBeLessThan(150);
    });
  });

  describe('getModulesByAnalysis', () => {
    it('should paginate modules efficiently', async () => {
      const result = await benchmark(
        'getModulesByAnalysis (first page)',
        async () => {
          const modules = await getModulesByAnalysis(mediumRunId, { page: 1, pageSize: 50 });
          expect(modules.items.length).toBeGreaterThan(0);
          expect(modules.total).toBeGreaterThan(0);
        },
        10,
      );

      console.log(formatBenchmarkResult(result));
      expect(result.duration).toBeLessThan(200);
    });

    it('should filter modules efficiently', async () => {
      const result = await benchmark(
        'getModulesByAnalysis (with filters)',
        async () => {
          const modules = await getModulesByAnalysis(mediumRunId, {
            page: 1,
            pageSize: 50,
            fileType: 'js',
            isThirdParty: false,
          });
          expect(modules.items.length).toBeGreaterThanOrEqual(0);
        },
        10,
      );

      console.log(formatBenchmarkResult(result));
      expect(result.duration).toBeLessThan(300);
    });

    it('should search modules efficiently', async () => {
      const result = await benchmark(
        'getModulesByAnalysis (with search)',
        async () => {
          const modules = await getModulesByAnalysis(mediumRunId, {
            page: 1,
            pageSize: 50,
            search: 'module',
          });
          expect(modules.items.length).toBeGreaterThanOrEqual(0);
        },
        10,
      );

      console.log(formatBenchmarkResult(result));
      expect(result.duration).toBeLessThan(300);
    });

    it('should handle large page sizes', async () => {
      const result = await benchmark(
        'getModulesByAnalysis (large page)',
        async () => {
          const modules = await getModulesByAnalysis(largeRunId, {
            page: 1,
            pageSize: 1000,
          });
          expect(modules.items.length).toBeGreaterThan(0);
        },
        5,
      );

      console.log(formatBenchmarkResult(result));
      expect(result.duration).toBeLessThan(1000);
    });
  });

  describe('getSymbolsByModule', () => {
    it('should retrieve symbols for a module quickly', async () => {
      if (mediumModuleIds.length === 0) {
        // Skip if no modules available
        return;
      }

      const moduleId = mediumModuleIds[0];
      const result = await benchmark(
        'getSymbolsByModule',
        async () => {
          const symbols = await getSymbolsByModule(moduleId);
          expect(Array.isArray(symbols)).toBe(true);
        },
        10,
      );

      console.log(formatBenchmarkResult(result));
      expect(result.duration).toBeLessThan(100);
    });
  });

  describe('getDependencyGraph', () => {
    it('should build dependency graph efficiently for small dataset', async () => {
      const result = await benchmark(
        'getDependencyGraph (small)',
        async () => {
          const graph = await getDependencyGraph(smallRunId);
          expect(graph.size).toBeGreaterThan(0);
        },
        5,
      );

      console.log(formatBenchmarkResult(result));
      expect(result.duration).toBeLessThan(500);
    });

    it('should build dependency graph efficiently for medium dataset', async () => {
      const result = await benchmark(
        'getDependencyGraph (medium)',
        async () => {
          const graph = await getDependencyGraph(mediumRunId);
          expect(graph.size).toBeGreaterThan(0);
        },
        3,
      );

      console.log(formatBenchmarkResult(result));
      expect(result.duration).toBeLessThan(2000);
    });

    it('should build dependency graph efficiently for large dataset', async () => {
      const result = await benchmark(
        'getDependencyGraph (large)',
        async () => {
          const graph = await getDependencyGraph(largeRunId);
          expect(graph.size).toBeGreaterThan(0);
        },
        2,
      );

      console.log(formatBenchmarkResult(result));
      expect(result.duration).toBeLessThan(10000);
    });
  });

  describe('compareAnalyses', () => {
    it('should compare analyses efficiently', async () => {
      // Create a second run for comparison
      const smallData = createTestData(TEST_CONFIGS.small);
      const smallInput2: BundleIngestionInput = {
        options: {
          bundlerType: 'webpack',
          projectName: 'query-bench-compare',
          enableIncremental: false,
        },
        ...smallData,
      };
      const result1 = await ingestBundle(smallInput2);

      // Create slightly different data
      const smallData2 = createTestData(TEST_CONFIGS.small);
      const smallInput3: BundleIngestionInput = {
        options: {
          bundlerType: 'webpack',
          projectName: 'query-bench-compare',
          enableIncremental: false,
        },
        ...smallData2,
      };
      const result2 = await ingestBundle(smallInput3);

      const benchResult = await benchmark(
        'compareAnalyses',
        async () => {
          const comparison = await compareAnalyses(result1.analysisRunId, result2.analysisRunId);
          expect(comparison).not.toBeNull();
        },
        3,
      );

      console.log(formatBenchmarkResult(benchResult));
      expect(benchResult.duration).toBeLessThan(2000);
    }, 60000);
  });

  describe('getAnalysisHistory', () => {
    it('should retrieve analysis history efficiently', async () => {
      const result = await benchmark(
        'getAnalysisHistory',
        async () => {
          const history = await getAnalysisHistory('query-bench-medium');
          expect(Array.isArray(history)).toBe(true);
          expect(history.length).toBeGreaterThan(0);
        },
        10,
      );

      console.log(formatBenchmarkResult(result));
      expect(result.duration).toBeLessThan(500);
    });
  });
});
