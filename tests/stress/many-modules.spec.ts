/**
 * Stress tests for projects with thousands of modules
 * Validates system can process 10,000+ modules efficiently
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
 * Generate many modules for stress testing
 */
function generateModules(count: number): ModuleInput[] {
  const modules: ModuleInput[] = [];

  for (let i = 0; i < count; i++) {
    modules.push({
      filePath: `./src/module${i}.js`,
      sourceContent: `
export function func${i}() {
  return ${i};
}

export const constant${i} = ${i} * 2;

export class Class${i} {
  constructor() {
    this.value = ${i};
  }
  
  getValue() {
    return this.value;
  }
}
      `.trim(),
      fileType: 'js',
    });
  }

  return modules;
}

/**
 * Generate modules with dependencies (chain pattern)
 */
function generateModulesWithDependencies(count: number): {
  modules: ModuleInput[];
  chunks: ChunkInput[];
} {
  const modules: ModuleInput[] = [];
  const moduleIds: string[] = [];

  // First module (entry point)
  modules.push({
    filePath: './src/index.js',
    sourceContent: `
import { func1 } from './module1.js';
export function main() {
  return func1();
}
    `.trim(),
    fileType: 'js',
  });
  moduleIds.push('./src/index.js');

  // Chain of dependencies
  for (let i = 1; i < count; i++) {
    modules.push({
      filePath: `./src/module${i}.js`,
      sourceContent: `
${i < count - 1 ? `import { func${i + 1} } from './module${i + 1}.js';` : ''}
export function func${i}() {
  return ${i}${i < count - 1 ? ` + func${i + 1}()` : ''};
}
      `.trim(),
      fileType: 'js',
    });
    moduleIds.push(`./src/module${i}.js`);
  }

  const chunks: ChunkInput[] = [
    {
      name: 'main',
      isEntry: true,
      isAsync: false,
      moduleIds,
    },
  ];

  return { modules, chunks };
}

describe('Many Modules Stress Tests', () => {
  const timeout = parseInt(
    typeof process !== 'undefined' && process.env?.STRESS_TEST_TIMEOUT
      ? process.env.STRESS_TEST_TIMEOUT
      : '300000',
    10,
  );

  it(
    'should handle 1,000 modules',
    async () => {
      const initialMemory = getMemoryUsageMB();
      const moduleCount = 1000;

      const modules = generateModules(moduleCount);
      const moduleIds = modules.map((m) => m.filePath);

      const options: IngestionOptions = {
        bundlerType: 'vite',
        projectName: 'stress-test-1k-modules',
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
          moduleIds,
        },
      ];

      const input: BundleIngestionInput = {
        options,
        bundles,
        modules,
        chunks,
      };

      const startTime = Date.now();
      const result = await ingestBundle(input);
      const duration = Date.now() - startTime;

      // Verify all modules were processed
      expect(result.analysisRunId).toBeGreaterThan(0);
      expect(result.stats.modulesWritten).toBe(moduleCount);
      expect(result.errors).toEqual([]);

      // Verify in database
      const modulesFromDb = await db.select().from(schema.module).execute();
      expect(modulesFromDb).toHaveLength(moduleCount);

      // Should complete in reasonable time (< 30 seconds for 1k modules)
      expect(duration).toBeLessThan(30000);

      // Memory should be reasonable
      const finalMemory = getMemoryUsageMB();
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(512); // Should use < 512MB for 1k modules
    },
    timeout,
  );

  it(
    'should handle 10,000 modules',
    async () => {
      const initialMemory = getMemoryUsageMB();
      const moduleCount = 10000;

      const modules = generateModules(moduleCount);
      const moduleIds = modules.map((m) => m.filePath);

      const options: IngestionOptions = {
        bundlerType: 'vite',
        projectName: 'stress-test-10k-modules',
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
          moduleIds,
        },
      ];

      const input: BundleIngestionInput = {
        options,
        bundles,
        modules,
        chunks,
      };

      const startTime = Date.now();
      const result = await ingestBundle(input);
      const duration = Date.now() - startTime;

      // Verify all modules were processed
      expect(result.analysisRunId).toBeGreaterThan(0);
      expect(result.stats.modulesWritten).toBe(moduleCount);
      expect(result.errors).toEqual([]);

      // Verify in database
      const modulesFromDb = await db.select().from(schema.module).execute();
      expect(modulesFromDb).toHaveLength(moduleCount);

      // Should complete in reasonable time (< 5 minutes for 10k modules)
      expect(duration).toBeLessThan(300000);

      // Memory should be reasonable (may be higher for 10k modules)
      const finalMemory = getMemoryUsageMB();
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(1024); // Should use < 1GB for 10k modules
    },
    { timeout: timeout * 2 }, // Allow more time for 10k modules
  );

  it(
    'should handle 10,000 modules with dependencies',
    async () => {
      const initialMemory = getMemoryUsageMB();
      const moduleCount = 10000;

      const { modules, chunks } = generateModulesWithDependencies(moduleCount);

      const options: IngestionOptions = {
        bundlerType: 'vite',
        projectName: 'stress-test-10k-modules-deps',
        enableIncremental: false,
      };

      const bundles: BundleInput[] = [
        {
          fileName: 'main.js',
          content: '/* bundled code */',
          type: 'js',
        },
      ];

      const input: BundleIngestionInput = {
        options,
        bundles,
        modules,
        chunks,
      };

      const startTime = Date.now();
      const result = await ingestBundle(input);
      const duration = Date.now() - startTime;

      // Verify all modules were processed
      expect(result.analysisRunId).toBeGreaterThan(0);
      expect(result.stats.modulesWritten).toBe(moduleCount);

      // Should have dependencies (chain creates dependencies)
      expect(result.stats.dependenciesWritten).toBeGreaterThan(0);
      expect(result.errors).toEqual([]);

      // Verify in database
      const modulesFromDb = await db.select().from(schema.module).execute();
      expect(modulesFromDb).toHaveLength(moduleCount);

      const depsFromDb = await db.select().from(schema.dependency).execute();
      expect(depsFromDb.length).toBeGreaterThan(0);

      // Should complete in reasonable time
      expect(duration).toBeLessThan(300000);

      // Memory should be reasonable
      const finalMemory = getMemoryUsageMB();
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(1024);
    },
    { timeout: timeout * 2 },
  );

  it(
    'should extract symbols from many modules efficiently',
    async () => {
      const moduleCount = 1000;
      const modules = generateModules(moduleCount);
      const moduleIds = modules.map((m) => m.filePath);

      const options: IngestionOptions = {
        bundlerType: 'vite',
        projectName: 'stress-test-symbol-extraction',
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
          moduleIds,
        },
      ];

      const input: BundleIngestionInput = {
        options,
        bundles,
        modules,
        chunks,
      };

      const result = await ingestBundle(input);

      // Should extract symbols from all modules
      expect(result.stats.symbolsWritten).toBeGreaterThan(moduleCount); // At least one symbol per module
      expect(result.errors).toEqual([]);

      // Verify symbols in database
      const symbolsFromDb = await db.select().from(schema.symbol).execute();
      expect(symbolsFromDb.length).toBeGreaterThan(moduleCount);
    },
    timeout,
  );
});
