/**
 * Stress tests for concurrent ingestion operations
 * Validates system handles multiple concurrent ingestion requests safely
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
import { eq } from 'drizzle-orm';

// Mock the db module to use test database
vi.mock('../../src/lib/server/db/index.js', async () => {
  const Database = (await import('better-sqlite3')).default;
  const { drizzle } = await import('drizzle-orm/better-sqlite3');
  const { schema } = await import('@smappy/store');

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
const { schema } = await import('@smappy/store');

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
 * Create a simple ingestion input for a project
 */
function createIngestionInput(projectName: string, moduleCount: number = 10): BundleIngestionInput {
  const modules: ModuleInput[] = [];
  for (let i = 0; i < moduleCount; i++) {
    modules.push({
      filePath: `./src/module${i}.js`,
      sourceContent: `
export function func${i}() {
  return ${i};
}
      `.trim(),
      fileType: 'js',
    });
  }

  const options: IngestionOptions = {
    bundlerType: 'vite',
    projectName,
    enableIncremental: false,
  };

  const bundles: BundleInput[] = [
    {
      fileName: 'main.js',
      content: '/* bundled code */',
      type: 'js',
    },
  ];

  const chunks: ChunkInput[] = [
    {
      name: 'main',
      isEntry: true,
      isAsync: false,
      moduleIds: modules.map((m) => m.filePath),
    },
  ];

  return {
    options,
    bundles,
    modules,
    chunks,
  };
}

describe('Concurrent Ingestion Stress Tests', () => {
  const timeout = parseInt(
    typeof process !== 'undefined' && process.env?.STRESS_TEST_TIMEOUT
      ? process.env.STRESS_TEST_TIMEOUT
      : '300000',
    10,
  );

  it(
    'should handle 5 concurrent ingestion operations',
    async () => {
      const initialMemory = getMemoryUsageMB();
      const concurrentCount = 5;

      const inputs = Array.from({ length: concurrentCount }, (_, i) =>
        createIngestionInput(`concurrent-project-${i}`, 50),
      );

      // Start all ingestion operations concurrently
      const promises = inputs.map((input) => ingestBundle(input));

      // Wait for all to complete
      const results = await Promise.all(promises);

      // Verify all completed successfully
      expect(results).toHaveLength(concurrentCount);

      for (const result of results) {
        expect(result.analysisRunId).toBeGreaterThan(0);
        expect(result.stats.modulesWritten).toBe(50);
        expect(result.errors).toEqual([]);
      }

      // Verify all analysis runs were created
      const analysisRuns = await db.select().from(schema.analysisRun).execute();
      expect(analysisRuns).toHaveLength(concurrentCount);

      // Verify all modules were written
      const modules = await db.select().from(schema.module).execute();
      expect(modules).toHaveLength(concurrentCount * 50);

      // Memory should be reasonable
      const finalMemory = getMemoryUsageMB();
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(512);
    },
    timeout,
  );

  it(
    'should handle 10 concurrent ingestion operations',
    async () => {
      const initialMemory = getMemoryUsageMB();
      const concurrentCount = 10;

      const inputs = Array.from({ length: concurrentCount }, (_, i) =>
        createIngestionInput(`concurrent-project-${i}`, 20),
      );

      // Start all ingestion operations concurrently
      const promises = inputs.map((input) => ingestBundle(input));

      // Wait for all to complete
      const results = await Promise.all(promises);

      // Verify all completed successfully
      expect(results).toHaveLength(concurrentCount);

      for (const result of results) {
        expect(result.analysisRunId).toBeGreaterThan(0);
        expect(result.stats.modulesWritten).toBe(20);
        expect(result.errors).toEqual([]);
      }

      // Verify all analysis runs were created (transaction safety)
      const analysisRuns = await db.select().from(schema.analysisRun).execute();
      expect(analysisRuns).toHaveLength(concurrentCount);

      // Verify data consistency (all modules for each run exist)
      const modules = await db.select().from(schema.module).execute();
      expect(modules).toHaveLength(concurrentCount * 20);

      // Memory should be reasonable
      const finalMemory = getMemoryUsageMB();
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(512);
    },
    timeout,
  );

  it(
    'should handle concurrent ingestion with different project names',
    async () => {
      const concurrentCount = 5;

      const projectNames = ['project-a', 'project-b', 'project-c', 'project-d', 'project-e'];
      const inputs = projectNames.map((name) => createIngestionInput(name, 30));

      // Start all ingestion operations concurrently
      const promises = inputs.map((input) => ingestBundle(input));

      // Wait for all to complete
      const results = await Promise.all(promises);

      // Verify all completed successfully
      expect(results).toHaveLength(concurrentCount);

      // Verify each project has its own analysis run
      const analysisRuns = await db.select().from(schema.analysisRun).execute();
      expect(analysisRuns).toHaveLength(concurrentCount);

      // Verify project names are unique and correct
      const projectNameSet = new Set(analysisRuns.map((r) => r.projectName));
      expect(projectNameSet.size).toBe(concurrentCount);

      for (const projectName of projectNames) {
        expect(projectNameSet.has(projectName)).toBe(true);
      }

      // Verify no data leakage between projects
      for (let i = 0; i < concurrentCount; i++) {
        const run = analysisRuns.find((r) => r.projectName === projectNames[i]);
        expect(run).toBeDefined();

        if (run) {
          const projectModules = await db
            .select()
            .from(schema.module)
            .where(eq(schema.module.analysisRunId, run.id))
            .execute();

          expect(projectModules).toHaveLength(30);
        }
      }
    },
    timeout,
  );

  it(
    'should handle concurrent ingestion with error recovery',
    async () => {
      const validInputs = Array.from({ length: 3 }, (_, i) =>
        createIngestionInput(`valid-project-${i}`, 10),
      );

      // Create an invalid input (missing required fields)
      const invalidInput: BundleIngestionInput = {
        options: {
          bundlerType: 'vite',
          projectName: 'invalid-project',
          enableIncremental: false,
        },
        bundles: [],
        modules: [],
        chunks: [],
      };

      // Start all ingestion operations concurrently (including invalid one)
      const promises = [
        ...validInputs.map((input) => ingestBundle(input)),
        ingestBundle(invalidInput), // This might fail or handle gracefully
      ];

      // Wait for all to complete (should not throw)
      const results = await Promise.allSettled(promises);

      // Verify valid inputs succeeded
      const validResults = results.slice(0, 3);
      for (const result of validResults) {
        expect(result.status).toBe('fulfilled');
        if (result.status === 'fulfilled') {
          expect(result.value.analysisRunId).toBeGreaterThan(0);
        }
      }

      // At least valid inputs should have completed
      const analysisRuns = await db.select().from(schema.analysisRun).execute();
      expect(analysisRuns.length).toBeGreaterThanOrEqual(3);
    },
    timeout,
  );

  it(
    'should maintain data consistency under concurrent load',
    async () => {
      const initialMemory = getMemoryUsageMB();
      const concurrentCount = 8;

      const inputs = Array.from({ length: concurrentCount }, (_, i) =>
        createIngestionInput(`consistency-project-${i}`, 25),
      );

      // Start all ingestion operations concurrently
      const startTime = Date.now();
      const promises = inputs.map((input) => ingestBundle(input));
      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      // Verify all completed successfully
      expect(results).toHaveLength(concurrentCount);

      // Verify all have unique analysis run IDs
      const analysisRunIds = results.map((r) => r.analysisRunId);
      const uniqueIds = new Set(analysisRunIds);
      expect(uniqueIds.size).toBe(concurrentCount); // No duplicates

      // Verify database consistency
      const analysisRuns = await db.select().from(schema.analysisRun).execute();
      expect(analysisRuns).toHaveLength(concurrentCount);

      const modules = await db.select().from(schema.module).execute();
      expect(modules).toHaveLength(concurrentCount * 25);

      // Verify foreign key relationships are intact
      for (const run of analysisRuns) {
        const runModules = await db
          .select()
          .from(schema.module)
          .where(eq(schema.module.analysisRunId, run.id))
          .execute();
        expect(runModules).toHaveLength(25);
      }

      // Should complete in reasonable time
      expect(duration).toBeLessThan(60000); // < 1 minute for 8 concurrent operations

      // Memory should be reasonable
      const finalMemory = getMemoryUsageMB();
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(512);
    },
    timeout,
  );
});
