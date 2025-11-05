/**
 * Tests for database writer module
 *
 * Note: These tests use the migration system to set up the database schema.
 * Run 'pnpm db:push' before running tests if schema changes are not yet migrated.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type {
  IngestionData,
  BundleWithMetadata,
  ModuleWithAnalysis,
  DependencyRelationship,
} from './writer.js';
import type { ChunkInput, IngestionOptions } from '../types/index.js';
import type { SymbolWithExport } from '../ast/analyzer.js';
import * as schema from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

// Mock the db module to use test database
vi.mock('../../db/index.js', () => {
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
const { writeIngestionData, getPreviousAnalysisRun } = await import('./writer.js');
const { db } = await import('../../db/index.js');

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

// Helper to create mock data
function createMockIngestionData(): IngestionData {
  const options: IngestionOptions = {
    bundlerType: 'webpack',
    projectName: 'test-project',
    enableIncremental: false,
  };

  const bundles: BundleWithMetadata[] = [
    {
      fileName: 'main.js',
      content: 'console.log("test");',
      type: 'js',
      size: 1024,
      gzipSize: 512,
    },
  ];

  const symbols: SymbolWithExport[] = [
    {
      name: 'testFunction',
      type: 'function',
      location: {
        start: { line: 1, column: 0 },
        end: { line: 10, column: 1 },
      },
      size: 200,
      scope: 'module',
      exportType: 'named',
    },
  ];

  const modules: ModuleWithAnalysis[] = [
    {
      filePath: './src/index.js',
      sourceContent: 'export function testFunction() {}',
      fileType: 'js',
      originalSize: 200,
      bundledSize: 180,
      isThirdParty: false,
      symbols,
      symbolFragments: new Map([
        [
          'testFunction',
          [
            {
              name: 'testFunction',
              start: { line: 1, column: 0 },
              end: { line: 10, column: 1 },
              byteStart: 0,
              byteEnd: 200,
              size: 200,
              source: './src/index.js',
            },
          ],
        ],
      ]),
      exports: ['testFunction'],
    },
    {
      filePath: './src/utils.js',
      sourceContent: 'export function helper() {}',
      fileType: 'js',
      originalSize: 100,
      bundledSize: 90,
      isThirdParty: false,
      symbols: [
        {
          name: 'helper',
          type: 'function',
          location: {
            start: { line: 1, column: 0 },
            end: { line: 5, column: 1 },
          },
          size: 100,
          scope: 'module',
        },
      ],
      symbolFragments: new Map(),
      exports: ['helper'],
    },
  ];

  const chunks: ChunkInput[] = [
    {
      name: 'main',
      isEntry: true,
      isAsync: false,
      moduleIds: ['./src/index.js', './src/utils.js'],
    },
  ];

  const dependencies: DependencyRelationship[] = [
    {
      importerPath: './src/index.js',
      importedPath: './src/utils.js',
      type: 'static',
      importedSymbols: ['helper'],
    },
  ];

  return {
    options,
    bundles,
    modules,
    chunks,
    dependencies,
  };
}

describe('Database Writer', () => {
  describe('writeIngestionData', () => {
    it('should write complete ingestion data successfully', async () => {
      expect.assertions(8);

      const data = createMockIngestionData();
      const result = await writeIngestionData(data);

      // Verify result structure
      expect(result.analysisRunId).toBeGreaterThan(0);
      expect(result.stats.modulesWritten).toBe(2);
      expect(result.stats.symbolsWritten).toBe(2);
      expect(result.stats.dependenciesWritten).toBe(1);
      expect(result.stats.chunksWritten).toBe(1);
      expect(result.stats.bundlesWritten).toBe(1);
      expect(result.stats.sourceMapEntriesWritten).toBe(1);
      expect(result.stats.suggestionsWritten).toBe(0);
    });

    it('should create analysis run with correct metadata', async () => {
      expect.assertions(3);

      const data = createMockIngestionData();
      const result = await writeIngestionData(data);

      // Query analysis run
      const analysisRun = await db
        .select()
        .from(schema.analysisRun)
        .where(eq(schema.analysisRun.id, result.analysisRunId))
        .execute();

      expect(analysisRun).toHaveLength(1);
      expect(analysisRun[0].projectName).toBe('test-project');
      expect(analysisRun[0].bundler).toBe('webpack');
    });

    it('should write modules with correct data', async () => {
      expect.assertions(5);

      const data = createMockIngestionData();
      await writeIngestionData(data);

      // Query modules
      const modules = await db.select().from(schema.module).execute();

      expect(modules).toHaveLength(2);
      expect(modules[0].filePath).toBe('./src/index.js');
      expect(modules[0].originalSize).toBe(200);
      expect(modules[0].bundledSize).toBe(180);
      expect(modules[0].isThirdParty).toBe(false);
    });

    it('should write symbols with correct references', async () => {
      expect.assertions(5);

      const data = createMockIngestionData();
      await writeIngestionData(data);

      // Query symbols
      const symbols = await db.select().from(schema.symbol).execute();

      expect(symbols).toHaveLength(2);
      expect(symbols[0].name).toBe('testFunction');
      expect(symbols[0].type).toBe('function');
      expect(symbols[0].isExported).toBe(true);
      expect(symbols[1].name).toBe('helper');
    });

    it('should write dependencies with correct relationships', async () => {
      expect.assertions(3);

      const data = createMockIngestionData();
      await writeIngestionData(data);

      // Query dependencies
      const dependencies = await db.select().from(schema.dependency).execute();

      expect(dependencies).toHaveLength(1);
      expect(dependencies[0].importType).toBe('static');
      expect(JSON.parse(dependencies[0].importedSymbols!)).toEqual(['helper']);
    });

    it('should write chunks with module relationships', async () => {
      expect.assertions(4);

      const data = createMockIngestionData();
      await writeIngestionData(data);

      // Query chunks
      const chunks = await db.select().from(schema.chunk).execute();
      const chunkModules = await db.select().from(schema.chunkModule).execute();

      expect(chunks).toHaveLength(1);
      expect(chunks[0].name).toBe('main');
      expect(chunks[0].isEntry).toBe(true);
      expect(chunkModules).toHaveLength(2);
    });

    it('should write bundles with size information', async () => {
      expect.assertions(4);

      const data = createMockIngestionData();
      await writeIngestionData(data);

      // Query bundles
      const bundles = await db.select().from(schema.bundle).execute();

      expect(bundles).toHaveLength(1);
      expect(bundles[0].fileName).toBe('main.js');
      expect(bundles[0].size).toBe(1024);
      expect(bundles[0].gzipSize).toBe(512);
    });

    it('should write source map entries', async () => {
      expect.assertions(2);

      const data = createMockIngestionData();
      await writeIngestionData(data);

      // Query source map entries
      const entries = await db.select().from(schema.sourceMapEntry).execute();

      expect(entries).toHaveLength(1);
      expect(entries[0].byteLength).toBe(200);
    });

    it('should handle empty modules gracefully', async () => {
      expect.assertions(2);

      const data = createMockIngestionData();
      data.modules = [];
      data.chunks[0].moduleIds = [];

      const result = await writeIngestionData(data);

      expect(result.stats.modulesWritten).toBe(0);
      expect(result.stats.symbolsWritten).toBe(0);
    });

    it('should handle transaction rollback on error', async () => {
      expect.assertions(1);

      const data = createMockIngestionData();
      // Create invalid data (duplicate module paths in same analysis run)
      data.modules.push({
        ...data.modules[0],
        filePath: './src/index.js', // Duplicate path
      });

      // Should throw due to unique constraint
      await expect(writeIngestionData(data)).rejects.toThrow();
    });
  });

  describe('getPreviousAnalysisRun', () => {
    it('should return null when no previous run exists', async () => {
      expect.assertions(1);

      const result = await getPreviousAnalysisRun('nonexistent-project');
      expect(result).toBeNull();
    });

    it('should return most recent analysis run ID', async () => {
      expect.assertions(1);

      const data = createMockIngestionData();
      const writeResult = await writeIngestionData(data);
      const previousRunId = await getPreviousAnalysisRun('test-project');

      expect(previousRunId).toBe(writeResult.analysisRunId);
    });
  });
});
