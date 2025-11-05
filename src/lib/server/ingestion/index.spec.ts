/**
 * Tests for main ingestion orchestrator
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ingestBundle, type BundleIngestionInput } from './index.js';
import type { IngestionOptions, BundleInput, ModuleInput, ChunkInput } from './types/index.js';

// Mock the db module to use test database
vi.mock('../db/index.js', async () => {
  const Database = (await import('better-sqlite3')).default;
  const { drizzle } = await import('drizzle-orm/better-sqlite3');
  const schema = await import('../db/schema.js');

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
const { db } = await import('../db/index.js');
const schema = await import('../db/schema.js');

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

// ============================================================================
// Test Helpers
// ============================================================================

function createTestIngestionInput(): BundleIngestionInput {
  const options: IngestionOptions = {
    bundlerType: 'webpack',
    projectName: 'test-project',
    enableIncremental: false,
  };

  const bundles: BundleInput[] = [
    {
      fileName: 'main.js',
      content: `
export function add(a, b) {
  return a + b;
}

export function multiply(a, b) {
  return a * b;
}
      `.trim(),
      type: 'js',
    },
  ];

  const modules: ModuleInput[] = [
    {
      filePath: './src/math.js',
      sourceContent: `
export function add(a, b) {
  return a + b;
}

export function multiply(a, b) {
  return a * b;
}
      `.trim(),
      fileType: 'js',
    },
    {
      filePath: './src/index.js',
      sourceContent: `
import { add } from './math.js';

console.log(add(1, 2));
      `.trim(),
      fileType: 'js',
    },
  ];

  const chunks: ChunkInput[] = [
    {
      name: 'main',
      isEntry: true,
      isAsync: false,
      moduleIds: ['./src/math.js', './src/index.js'],
    },
  ];

  return {
    options,
    bundles,
    modules,
    chunks,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('Ingestion Orchestrator', () => {
  describe('ingestBundle', () => {
    it('should perform end-to-end ingestion successfully', async () => {
      expect.assertions(9);

      const input = createTestIngestionInput();
      const result = await ingestBundle(input);

      // Verify result structure
      expect(result.analysisRunId).toBeGreaterThan(0);
      expect(result.stats.modulesWritten).toBe(2);
      expect(result.stats.symbolsWritten).toBeGreaterThan(0); // Should extract symbols from modules
      expect(result.stats.bundlesWritten).toBe(1);
      expect(result.stats.chunksWritten).toBe(1);

      // Verify database state
      const analysisRuns = await db.select().from(schema.analysisRun).execute();
      expect(analysisRuns).toHaveLength(1);

      const modules = await db.select().from(schema.module).execute();
      expect(modules).toHaveLength(2);

      const bundles = await db.select().from(schema.bundle).execute();
      expect(bundles).toHaveLength(1);

      // Should not have fatal errors
      expect(result.errors).toEqual([]);
    });

    it('should extract symbols from modules', async () => {
      expect.assertions(4);

      const input = createTestIngestionInput();
      const result = await ingestBundle(input);

      const symbols = await db.select().from(schema.symbol).execute();

      // Should extract at least 'add' and 'multiply' functions from math.js
      expect(symbols.length).toBeGreaterThan(0);
      const symbolNames = symbols.map((s) => s.name);
      expect(symbolNames).toContain('add');
      expect(symbolNames).toContain('multiply');
      expect(result.stats.symbolsWritten).toBe(symbols.length);
    });

    it('should build dependency graph', async () => {
      expect.assertions(4);

      const input = createTestIngestionInput();
      const result = await ingestBundle(input);

      const dependencies = await db.select().from(schema.dependency).execute();

      // index.js imports from math.js
      expect(dependencies.length).toBeGreaterThan(0);
      expect(result.stats.dependenciesWritten).toBe(dependencies.length);

      const dep = dependencies[0];
      expect(dep.importType).toBe('static');
      expect(JSON.parse(dep.importedSymbols || '[]')).toContain('add');
    });

    it('should compute bundle sizes', async () => {
      expect.assertions(3);

      const input = createTestIngestionInput();
      await ingestBundle(input);

      const bundles = await db.select().from(schema.bundle).execute();
      const bundle = bundles[0];

      expect(bundle.size).toBeGreaterThan(0);
      expect(bundle.gzipSize).toBeGreaterThan(0);
      expect(bundle.gzipSize).toBeLessThan(bundle.size); // Gzip should be smaller
    });

    it('should detect third-party modules', async () => {
      expect.assertions(3);

      const input = createTestIngestionInput();
      input.modules.push({
        filePath: './node_modules/lodash/index.js',
        sourceContent: 'export function identity(x) { return x; }',
        fileType: 'js',
      });
      input.chunks[0].moduleIds.push('./node_modules/lodash/index.js');

      await ingestBundle(input);

      const modules = await db.select().from(schema.module).execute();
      const lodashModule = modules.find((m) => m.filePath.includes('lodash'));

      expect(lodashModule).toBeDefined();
      expect(lodashModule!.isThirdParty).toBe(true);
      expect(lodashModule!.packageName).toBe('lodash');
    });

    it('should handle scoped package names', async () => {
      expect.assertions(2);

      const input = createTestIngestionInput();
      input.modules.push({
        filePath: './node_modules/@babel/core/index.js',
        sourceContent: 'export function parse() {}',
        fileType: 'js',
      });
      input.chunks[0].moduleIds.push('./node_modules/@babel/core/index.js');

      await ingestBundle(input);

      const modules = await db.select().from(schema.module).execute();
      const babelModule = modules.find((m) => m.filePath.includes('@babel'));

      expect(babelModule).toBeDefined();
      expect(babelModule!.packageName).toBe('@babel/core');
    });

    it('should extract exported symbols', async () => {
      expect.assertions(2);

      const input = createTestIngestionInput();
      await ingestBundle(input);

      const modules = await db.select().from(schema.module).execute();
      const mathModule = modules.find((m) => m.filePath.includes('math.js'));

      expect(mathModule).toBeDefined();
      const exports = JSON.parse(mathModule!.exports || '[]');
      expect(exports).toEqual(expect.arrayContaining(['add', 'multiply']));
    });

    it('should handle empty modules list', async () => {
      expect.assertions(3);

      const input = createTestIngestionInput();
      input.modules = [];
      input.chunks[0].moduleIds = [];

      const result = await ingestBundle(input);

      expect(result.analysisRunId).toBeGreaterThan(0);
      expect(result.stats.modulesWritten).toBe(0);
      expect(result.stats.symbolsWritten).toBe(0);
    });

    it('should collect non-fatal errors', async () => {
      expect.assertions(2);

      const input = createTestIngestionInput();
      // Add a module with invalid syntax
      input.modules.push({
        filePath: './src/broken.js',
        sourceContent: 'this is not valid javascript!!!',
        fileType: 'js',
      });
      input.chunks[0].moduleIds.push('./src/broken.js');

      const result = await ingestBundle(input);

      // Should complete but with errors
      expect(result.analysisRunId).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should create chunk-module relationships', async () => {
      expect.assertions(2);

      const input = createTestIngestionInput();
      await ingestBundle(input);

      const chunkModules = await db.select().from(schema.chunkModule).execute();

      // main chunk should include both modules
      expect(chunkModules).toHaveLength(2);
      const chunks = await db.select().from(schema.chunk).execute();
      expect(chunks[0].name).toBe('main');
    });

    it('should handle multiple bundles', async () => {
      expect.assertions(2);

      const input = createTestIngestionInput();
      input.bundles.push({
        fileName: 'vendor.js',
        content: 'export const VENDOR = true;',
        type: 'js',
      });

      const result = await ingestBundle(input);

      expect(result.stats.bundlesWritten).toBe(2);
      const bundles = await db.select().from(schema.bundle).execute();
      expect(bundles).toHaveLength(2);
    });

    it('should handle multiple chunks', async () => {
      expect.assertions(2);

      const input = createTestIngestionInput();
      input.chunks.push({
        name: 'async-component',
        isEntry: false,
        isAsync: true,
        moduleIds: ['./src/math.js'],
      });

      const result = await ingestBundle(input);

      expect(result.stats.chunksWritten).toBe(2);
      const chunks = await db.select().from(schema.chunk).execute();
      expect(chunks).toHaveLength(2);
    });
  });
});
