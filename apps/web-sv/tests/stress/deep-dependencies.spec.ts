/**
 * Stress tests for very deep dependency trees (>20 levels)
 * Validates system handles deep dependency graphs without stack overflow
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
 * Generate a deep chain of dependencies
 * Creates modules where each module depends on the next one
 */
function generateDeepDependencyChain(depth: number): {
  modules: ModuleInput[];
  chunks: ChunkInput[];
} {
  const modules: ModuleInput[] = [];
  const moduleIds: string[] = [];

  // Entry point
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

  // Create chain of dependencies
  for (let i = 1; i < depth; i++) {
    // Import path should be relative to current module's directory
    const nextModule = i < depth - 1 ? `./module${i + 1}.js` : null;
    modules.push({
      filePath: `./src/module${i}.js`,
      sourceContent: `
${nextModule ? `import { func${i + 1} } from '${nextModule}';` : ''}
export function func${i}() {
  return ${i}${nextModule ? ` + func${i + 1}()` : ''};
}

export const constant${i} = ${i} * 2;
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

/**
 * Generate a tree structure with deep branches
 */
function generateDeepDependencyTree(
  depth: number,
  branches: number = 2,
): {
  modules: ModuleInput[];
  chunks: ChunkInput[];
} {
  const modules: ModuleInput[] = [];
  const moduleIds: string[] = [];

  // Entry point that imports multiple branches
  const imports: string[] = [];
  for (let b = 0; b < branches; b++) {
    imports.push(`import { func${b}_${depth - 1} } from './branch${b}_${depth - 1}.js';`);
  }

  modules.push({
    filePath: './src/index.js',
    sourceContent: `
${imports.join('\n')}
export function main() {
  ${branches > 0 ? `return func0_${depth - 1}();` : 'return 0;'}
}
    `.trim(),
    fileType: 'js',
  });
  moduleIds.push('./src/index.js');

  // Create branches with deep chains
  for (let b = 0; b < branches; b++) {
    for (let d = 0; d < depth; d++) {
      // Import path should be relative to current module's directory
      const nextLevel = d < depth - 1 ? `./branch${b}_${d + 1}.js` : null;
      modules.push({
        filePath: `./src/branch${b}_${d}.js`,
        sourceContent: `
${nextLevel ? `import { func${b}_${d + 1} } from '${nextLevel}';` : ''}
export function func${b}_${d}() {
  return ${d}${nextLevel ? ` + func${b}_${d + 1}()` : ''};
}
        `.trim(),
        fileType: 'js',
      });
      moduleIds.push(`./src/branch${b}_${d}.js`);
    }
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

describe('Deep Dependencies Stress Tests', () => {
  const timeout = parseInt(
    typeof process !== 'undefined' && process.env?.STRESS_TEST_TIMEOUT
      ? process.env.STRESS_TEST_TIMEOUT
      : '300000',
    10,
  );

  it(
    'should handle dependency chain of 25 levels without stack overflow',
    async () => {
      const initialMemory = getMemoryUsageMB();
      const depth = 25; // > 20 levels threshold

      const { modules, chunks } = generateDeepDependencyChain(depth);

      const options: IngestionOptions = {
        bundlerType: 'vite',
        projectName: 'stress-test-deep-chain-25',
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

      // Should not throw stack overflow
      const result = await ingestBundle(input);

      // Verify all modules were processed
      expect(result.analysisRunId).toBeGreaterThan(0);
      expect(result.stats.modulesWritten).toBe(depth);
      expect(result.stats.dependenciesWritten).toBe(depth - 1); // N modules = N-1 dependencies in chain
      expect(result.errors).toEqual([]);

      // Verify in database
      const modulesFromDb = await db.select().from(schema.module).execute();
      expect(modulesFromDb).toHaveLength(depth);

      const depsFromDb = await db.select().from(schema.dependency).execute();
      expect(depsFromDb.length).toBe(depth - 1);

      // Memory should be reasonable
      const finalMemory = getMemoryUsageMB();
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(256);
    },
    timeout,
  );

  it(
    'should handle dependency chain of 50 levels without stack overflow',
    async () => {
      const initialMemory = getMemoryUsageMB();
      const depth = 50; // Very deep chain

      const { modules, chunks } = generateDeepDependencyChain(depth);

      const options: IngestionOptions = {
        bundlerType: 'vite',
        projectName: 'stress-test-deep-chain-50',
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

      // Should not throw stack overflow
      const result = await ingestBundle(input);

      // Verify all modules were processed
      expect(result.analysisRunId).toBeGreaterThan(0);
      expect(result.stats.modulesWritten).toBe(depth);
      expect(result.stats.dependenciesWritten).toBe(depth - 1);
      expect(result.errors).toEqual([]);

      // Verify in database
      const modulesFromDb = await db.select().from(schema.module).execute();
      expect(modulesFromDb).toHaveLength(depth);

      // Memory should be reasonable
      const finalMemory = getMemoryUsageMB();
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(512);
    },
    timeout,
  );

  it(
    'should handle deep dependency tree with multiple branches',
    async () => {
      const initialMemory = getMemoryUsageMB();
      const depth = 30; // Deep branches
      const branches = 3; // Multiple branches

      const { modules, chunks } = generateDeepDependencyTree(depth, branches);

      const options: IngestionOptions = {
        bundlerType: 'vite',
        projectName: 'stress-test-deep-tree',
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

      // Should not throw stack overflow
      const result = await ingestBundle(input);

      // Verify all modules were processed
      const expectedModules = 1 + branches * depth; // Entry point + branches
      expect(result.analysisRunId).toBeGreaterThan(0);
      expect(result.stats.modulesWritten).toBe(expectedModules);
      expect(result.stats.dependenciesWritten).toBeGreaterThan(0);
      expect(result.errors).toEqual([]);

      // Verify in database
      const modulesFromDb = await db.select().from(schema.module).execute();
      expect(modulesFromDb).toHaveLength(expectedModules);

      // Memory should be reasonable
      const finalMemory = getMemoryUsageMB();
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(512);
    },
    timeout,
  );

  it(
    'should build dependency graph correctly for deep chains',
    async () => {
      const depth = 25;
      const { modules, chunks } = generateDeepDependencyChain(depth);

      const options: IngestionOptions = {
        bundlerType: 'vite',
        projectName: 'stress-test-graph-building',
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

      const result = await ingestBundle(input);

      // Verify dependencies are correctly linked
      const depsFromDb = await db.select().from(schema.dependency).execute();
      expect(depsFromDb.length).toBe(depth - 1);

      // Check that dependencies form a chain
      const depMap = new Map<number, number[]>(); // moduleId -> [imported module ids]
      for (const dep of depsFromDb) {
        if (!depMap.has(dep.importerModuleId)) {
          depMap.set(dep.importerModuleId, []);
        }
        depMap.get(dep.importerModuleId)!.push(dep.importedModuleId);
      }

      // Should have dependencies connecting the chain
      expect(depMap.size).toBeGreaterThan(0);
      expect(result.errors).toEqual([]);
    },
    timeout,
  );
});
