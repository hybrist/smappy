/**
 * Tests for incremental differ module
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  loadPreviousRun,
  computeModuleDiff,
  computeSymbolDiff,
  computeIncrementalDiff,
  shouldReanalyze,
  type PreviousModule,
  type PreviousSymbol,
  type IncrementalDiff,
} from './differ.js';
import type { ModuleInput, SymbolWithExport } from '@smappy/core';
import { schema } from '@smappy/store';
import { createHash } from 'crypto';

// Mock the db module to use test database
vi.mock('../../db/index.js', async () => {
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
  `);

  return { db: testDb };
});

// Import after mocking
const { db } = await import('../../db/index.js');

beforeEach(async () => {
  // Clear all tables before each test
  await db.delete(schema.symbol);
  await db.delete(schema.module);
  await db.delete(schema.analysisRun);
});

// ============================================================================
// Test Helpers
// ============================================================================

async function createTestAnalysisRun(projectName: string): Promise<number> {
  const result = await db
    .insert(schema.analysisRun)
    .values({ projectName, bundler: 'webpack' })
    .returning({ id: schema.analysisRun.id })
    .get();
  return result.id;
}

async function createTestModule(analysisRunId: number, filePath: string, size: number) {
  const result = await db
    .insert(schema.module)
    .values({
      analysisRunId,
      filePath,
      fileType: 'js',
      originalSize: size,
      bundledSize: size,
      isThirdParty: false,
    })
    .returning({ id: schema.module.id })
    .get();
  return result.id;
}

async function createTestSymbol(moduleId: number, name: string, astHash: string) {
  await db
    .insert(schema.symbol)
    .values({
      moduleId,
      name,
      type: 'function',
      sourceStartLine: 1,
      sourceStartCol: 0,
      sourceEndLine: 10,
      sourceEndCol: 1,
      astHash,
      isExported: true,
      computedBundledSize: 0,
      computedGzipSize: 0,
    })
    .run();
}

function createMockModuleInput(filePath: string, content: string): ModuleInput {
  return {
    filePath,
    sourceContent: content,
    fileType: 'js',
  };
}

function createMockSymbol(name: string): SymbolWithExport {
  return {
    name,
    type: 'function',
    location: {
      start: { line: 1, column: 0 },
      end: { line: 10, column: 1 },
    },
    size: 100,
    scope: 'module',
    exportType: 'named',
  };
}

// ============================================================================
// Tests: loadPreviousRun
// ============================================================================

describe('loadPreviousRun', () => {
  it('should return null when no previous run exists', async () => {
    expect.assertions(1);

    const result = await loadPreviousRun('nonexistent-project');
    expect(result).toBeNull();
  });

  it('should load previous run with modules and symbols', async () => {
    expect.assertions(4);

    const runId = await createTestAnalysisRun('test-project');
    const moduleId = await createTestModule(runId, './src/index.js', 200);
    await createTestSymbol(moduleId, 'testFunction', 'hash123');

    const result = await loadPreviousRun('test-project');

    expect(result).not.toBeNull();
    expect(result!.runId).toBe(runId);
    expect(result!.modules.size).toBe(1);
    expect(result!.modules.get('./src/index.js')!.symbols).toHaveLength(1);
  });

  it('should return most recent run when multiple exist', async () => {
    expect.assertions(3);

    const runId1 = await createTestAnalysisRun('test-project');
    await createTestModule(runId1, './src/old.js', 100);

    // Simulate time passing
    await new Promise((resolve) => setTimeout(resolve, 10));

    const runId2 = await createTestAnalysisRun('test-project');
    await createTestModule(runId2, './src/new.js', 200);

    const result = await loadPreviousRun('test-project');

    expect(result).not.toBeNull();
    expect(result!.runId).toBe(runId2);
    // Should have the newer module, not the older one
    expect(result!.modules.has('./src/new.js')).toBe(true);
  });

  it('should load multiple modules correctly', async () => {
    expect.assertions(3);

    const runId = await createTestAnalysisRun('test-project');
    await createTestModule(runId, './src/a.js', 100);
    await createTestModule(runId, './src/b.js', 200);

    const result = await loadPreviousRun('test-project');

    expect(result).not.toBeNull();
    expect(result!.modules.size).toBe(2);
    expect(result!.modules.has('./src/a.js')).toBe(true);
  });
});

// ============================================================================
// Tests: computeModuleDiff
// ============================================================================

describe('computeModuleDiff', () => {
  it('should mark all modules as added on first run', () => {
    expect.assertions(4);

    const current = [
      createMockModuleInput('./src/a.js', 'export const a = 1;'),
      createMockModuleInput('./src/b.js', 'export const b = 2;'),
    ];

    const diff = computeModuleDiff(null, current);

    expect(diff.added).toEqual(['./src/a.js', './src/b.js']);
    expect(diff.removed).toEqual([]);
    expect(diff.modified).toEqual([]);
    expect(diff.unchanged).toEqual([]);
  });

  it('should detect added modules', () => {
    expect.assertions(1);

    const previous = new Map<string, PreviousModule>([
      [
        './src/a.js',
        {
          filePath: './src/a.js',
          originalSize: 100,
          bundledSize: 90,
          contentHash: 'hash-a',
          symbols: [],
        },
      ],
    ]);

    const current = [
      createMockModuleInput('./src/a.js', 'export const a = 1;'),
      createMockModuleInput('./src/b.js', 'export const b = 2;'),
    ];

    const diff = computeModuleDiff(previous, current);

    expect(diff.added).toContain('./src/b.js');
  });

  it('should detect removed modules', () => {
    expect.assertions(1);

    const previous = new Map<string, PreviousModule>([
      [
        './src/a.js',
        {
          filePath: './src/a.js',
          originalSize: 100,
          bundledSize: 90,
          contentHash: 'hash-a',
          symbols: [],
        },
      ],
      [
        './src/b.js',
        {
          filePath: './src/b.js',
          originalSize: 100,
          bundledSize: 90,
          contentHash: 'hash-b',
          symbols: [],
        },
      ],
    ]);

    const current = [createMockModuleInput('./src/a.js', 'export const a = 1;')];

    const diff = computeModuleDiff(previous, current);

    expect(diff.removed).toContain('./src/b.js');
  });

  it('should detect modified modules by size change', () => {
    expect.assertions(1);

    const previous = new Map<string, PreviousModule>([
      [
        './src/a.js',
        {
          filePath: './src/a.js',
          originalSize: 100,
          bundledSize: 90,
          contentHash: 'hash-a',
          symbols: [],
        },
      ],
    ]);

    // Different size content
    const current = [
      createMockModuleInput('./src/a.js', 'export const a = 1; // This is much longer now!'),
    ];

    const diff = computeModuleDiff(previous, current);

    expect(diff.modified).toContain('./src/a.js');
  });
});

// ============================================================================
// Tests: computeSymbolDiff
// ============================================================================

describe('computeSymbolDiff', () => {
  it('should detect added symbols', () => {
    expect.assertions(1);

    const previous: PreviousSymbol[] = [
      { name: 'foo', type: 'function', astHash: 'hash-foo', isExported: true },
    ];

    const current: SymbolWithExport[] = [createMockSymbol('foo'), createMockSymbol('bar')];

    const diff = computeSymbolDiff('./src/test.js', previous, current);

    expect(diff.added).toContain('bar');
  });

  it('should detect removed symbols', () => {
    expect.assertions(1);

    const previous: PreviousSymbol[] = [
      { name: 'foo', type: 'function', astHash: 'hash-foo', isExported: true },
      { name: 'bar', type: 'function', astHash: 'hash-bar', isExported: true },
    ];

    const current: SymbolWithExport[] = [createMockSymbol('foo')];

    const diff = computeSymbolDiff('./src/test.js', previous, current);

    expect(diff.removed).toContain('bar');
  });

  it('should detect unchanged symbols', () => {
    expect.assertions(2);

    const mockSymbol = createMockSymbol('foo');

    // Compute the actual hash that will be used
    const expectedHash = createHash('sha256')
      .update(
        JSON.stringify({
          name: mockSymbol.name,
          type: mockSymbol.type,
          location: mockSymbol.location,
          scope: mockSymbol.scope,
          exportType: mockSymbol.exportType,
        }),
      )
      .digest('hex');

    const previous: PreviousSymbol[] = [
      { name: 'foo', type: 'function', astHash: expectedHash, isExported: true },
    ];

    const current: SymbolWithExport[] = [mockSymbol];

    const diff = computeSymbolDiff('./src/test.js', previous, current);

    expect(diff.unchanged).toContain('foo');
    expect(diff.modified).toHaveLength(0);
  });

  it('should handle empty symbol lists', () => {
    expect.assertions(4);

    const diff = computeSymbolDiff('./src/test.js', [], []);

    expect(diff.added).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
    expect(diff.modified).toHaveLength(0);
    expect(diff.unchanged).toHaveLength(0);
  });
});

// ============================================================================
// Tests: computeIncrementalDiff
// ============================================================================

describe('computeIncrementalDiff', () => {
  it('should handle first run (no previous data)', async () => {
    expect.assertions(3);

    const current = [createMockModuleInput('./src/a.js', 'export const a = 1;')];
    const symbols = new Map([[' ./src/a.js', [createMockSymbol('a')]]]);

    const diff = await computeIncrementalDiff('new-project', current, symbols);

    expect(diff.canUseIncremental).toBe(false);
    expect(diff.previousRunId).toBeNull();
    expect(diff.moduleDiff.added).toContain('./src/a.js');
  });

  it('should compute complete diff with previous run', async () => {
    expect.assertions(4);

    // Setup previous run
    const runId = await createTestAnalysisRun('test-project');
    const moduleId = await createTestModule(runId, './src/a.js', 100);
    await createTestSymbol(moduleId, 'foo', 'hash-foo');

    const current = [
      createMockModuleInput('./src/a.js', 'export const a = 1;'),
      createMockModuleInput('./src/b.js', 'export const b = 2;'),
    ];
    const symbols = new Map([
      ['./src/a.js', [createMockSymbol('foo')]],
      ['./src/b.js', [createMockSymbol('bar')]],
    ]);

    const diff = await computeIncrementalDiff('test-project', current, symbols);

    expect(diff.canUseIncremental).toBe(true);
    expect(diff.previousRunId).toBe(runId);
    expect(diff.moduleDiff.added).toContain('./src/b.js');
    expect(diff.symbolDiffs.size).toBeGreaterThan(0);
  });
});

// ============================================================================
// Tests: shouldReanalyze
// ============================================================================

describe('shouldReanalyze', () => {
  it('should always reanalyze on first run', () => {
    expect.assertions(1);

    const diff: IncrementalDiff = {
      moduleDiff: { added: [], removed: [], modified: [], unchanged: [] },
      symbolDiffs: new Map(),
      canUseIncremental: false,
      previousRunId: null,
    };

    expect(shouldReanalyze('./src/any.js', diff)).toBe(true);
  });

  it('should reanalyze added modules', () => {
    expect.assertions(1);

    const diff: IncrementalDiff = {
      moduleDiff: {
        added: ['./src/new.js'],
        removed: [],
        modified: [],
        unchanged: [],
      },
      symbolDiffs: new Map(),
      canUseIncremental: true,
      previousRunId: 1,
    };

    expect(shouldReanalyze('./src/new.js', diff)).toBe(true);
  });

  it('should reanalyze modified modules', () => {
    expect.assertions(1);

    const diff: IncrementalDiff = {
      moduleDiff: {
        added: [],
        removed: [],
        modified: ['./src/changed.js'],
        unchanged: [],
      },
      symbolDiffs: new Map(),
      canUseIncremental: true,
      previousRunId: 1,
    };

    expect(shouldReanalyze('./src/changed.js', diff)).toBe(true);
  });

  it('should skip unchanged modules', () => {
    expect.assertions(1);

    const diff: IncrementalDiff = {
      moduleDiff: {
        added: [],
        removed: [],
        modified: [],
        unchanged: ['./src/same.js'],
      },
      symbolDiffs: new Map([
        [
          './src/same.js',
          {
            filePath: './src/same.js',
            added: [],
            removed: [],
            modified: [],
            unchanged: ['foo'],
          },
        ],
      ]),
      canUseIncremental: true,
      previousRunId: 1,
    };

    expect(shouldReanalyze('./src/same.js', diff)).toBe(false);
  });

  it('should reanalyze if symbols changed', () => {
    expect.assertions(1);

    const diff: IncrementalDiff = {
      moduleDiff: {
        added: [],
        removed: [],
        modified: [],
        unchanged: ['./src/test.js'],
      },
      symbolDiffs: new Map([
        [
          './src/test.js',
          {
            filePath: './src/test.js',
            added: ['newSymbol'],
            removed: [],
            modified: [],
            unchanged: [],
          },
        ],
      ]),
      canUseIncremental: true,
      previousRunId: 1,
    };

    expect(shouldReanalyze('./src/test.js', diff)).toBe(true);
  });
});
