/**
 * Tests for query functions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { schema } from '@smappy/store';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

// Mock the db module to use test database
vi.mock('../db/index.js', () => {
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
const {
  getLatestAnalysis,
  getAnalysisById,
  getModulesByAnalysis,
  getSymbolsByModule,
  getDependencyGraph,
  compareAnalyses,
  getProjectSummaries,
} = await import('./index.js');
const { db } = await import('../db/index.js');

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

describe('Query Functions', () => {
  describe('getProjectSummaries', () => {
    it('returns project metadata with trend and stale flags', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-01-20T00:00:00Z'));

      try {
        const [alphaRun1] = await db
          .insert(schema.analysisRun)
          .values({
            projectName: 'alpha-project',
            bundler: 'vite',
            createdAt: '2024-12-20T12:00:00Z',
          })
          .returning();

        const [alphaRun2] = await db
          .insert(schema.analysisRun)
          .values({
            projectName: 'alpha-project',
            bundler: 'vite',
            createdAt: '2025-01-05T08:00:00Z',
          })
          .returning();

        const [betaRun] = await db
          .insert(schema.analysisRun)
          .values({
            projectName: 'beta-project',
            bundler: 'webpack',
            createdAt: '2025-01-19T09:30:00Z',
          })
          .returning();

        await db.insert(schema.module).values({
          analysisRunId: alphaRun2.id,
          filePath: 'src/index.js',
          fileType: 'javascript',
          originalSize: 100,
          bundledSize: 80,
        });
        await db.insert(schema.bundle).values({
          analysisRunId: alphaRun1.id,
          fileName: 'alpha-legacy.js',
          fileType: 'javascript',
          size: 1000,
          gzipSize: 600,
        });
        await db.insert(schema.bundle).values({
          analysisRunId: alphaRun2.id,
          fileName: 'alpha-main.js',
          fileType: 'javascript',
          size: 1500,
          gzipSize: 900,
        });

        await db.insert(schema.module).values({
          analysisRunId: betaRun.id,
          filePath: 'src/app.js',
          fileType: 'javascript',
          originalSize: 120,
          bundledSize: 110,
        });
        await db.insert(schema.bundle).values({
          analysisRunId: betaRun.id,
          fileName: 'beta-main.js',
          fileType: 'javascript',
          size: 2000,
          gzipSize: 1200,
        });

        const summaries = await getProjectSummaries();

        expect(summaries).toHaveLength(2);
        expect(summaries[0]).toMatchObject({
          name: 'beta-project',
          bundler: 'webpack',
          totalSize: 2000,
          moduleCount: 1,
          changePercent: null,
          isStale: false,
        });

        expect(summaries[1]).toMatchObject({
          name: 'alpha-project',
          bundler: 'vite',
          totalSize: 1500,
          moduleCount: 1,
          isStale: true,
        });

        expect(summaries[1].changePercent).toBeCloseTo(50, 5);
        expect(summaries[1].lastAnalyzedAt).toBe('2025-01-05T08:00:00.000Z');
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('getLatestAnalysis', () => {
    it('should return null for non-existent project', async () => {
      const result = await getLatestAnalysis('non-existent');
      expect(result).toBeNull();
    });

    it('should return latest analysis for project', async () => {
      // Create two analysis runs
      const run1 = await db
        .insert(schema.analysisRun)
        .values({
          projectName: 'test-project',
          bundler: 'webpack',
        })
        .returning();

      const run2 = await db
        .insert(schema.analysisRun)
        .values({
          projectName: 'test-project',
          bundler: 'vite',
        })
        .returning();

      // Add some modules and bundles
      await db.insert(schema.module).values({
        analysisRunId: run1[0].id,
        filePath: 'src/foo.js',
        fileType: 'javascript',
        originalSize: 100,
        bundledSize: 100,
      });

      await db.insert(schema.module).values({
        analysisRunId: run2[0].id,
        filePath: 'src/bar.js',
        fileType: 'javascript',
        originalSize: 200,
        bundledSize: 200,
      });

      await db.insert(schema.bundle).values({
        analysisRunId: run1[0].id,
        fileName: 'main.js',
        fileType: 'javascript',
        size: 1000,
        gzipSize: 500,
      });

      await db.insert(schema.bundle).values({
        analysisRunId: run2[0].id,
        fileName: 'main.js',
        fileType: 'javascript',
        size: 2000,
        gzipSize: 1000,
      });

      const result = await getLatestAnalysis('test-project');

      expect(result).not.toBeNull();
      expect(result?.id).toBe(run2[0].id);
      expect(result?.bundler).toBe('vite');
      expect(result?.moduleCount).toBe(1);
      expect(result?.bundleCount).toBe(1);
      expect(result?.totalSize).toBe(2000);
      expect(result?.totalGzipSize).toBe(1000);
    });
  });

  describe('getAnalysisById', () => {
    it('should return null for non-existent ID', async () => {
      const result = await getAnalysisById(999);
      expect(result).toBeNull();
    });

    it('should return analysis by ID', async () => {
      const run = await db
        .insert(schema.analysisRun)
        .values({
          projectName: 'test-project',
          bundler: 'webpack',
        })
        .returning();

      await db.insert(schema.module).values({
        analysisRunId: run[0].id,
        filePath: 'src/foo.js',
        fileType: 'javascript',
        originalSize: 100,
        bundledSize: 100,
      });

      await db.insert(schema.bundle).values({
        analysisRunId: run[0].id,
        fileName: 'main.js',
        fileType: 'javascript',
        size: 1000,
        gzipSize: 500,
      });

      const result = await getAnalysisById(run[0].id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(run[0].id);
      expect(result?.projectName).toBe('test-project');
      expect(result?.moduleCount).toBe(1);
      expect(result?.bundleCount).toBe(1);
    });
  });

  describe('getModulesByAnalysis', () => {
    it('should return empty result for non-existent analysis', async () => {
      const result = await getModulesByAnalysis(999);
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should return all modules for analysis', async () => {
      const run = await db
        .insert(schema.analysisRun)
        .values({
          projectName: 'test-project',
          bundler: 'webpack',
        })
        .returning();

      await db.insert(schema.module).values([
        {
          analysisRunId: run[0].id,
          filePath: 'src/foo.js',
          fileType: 'javascript',
          originalSize: 100,
          bundledSize: 100,
        },
        {
          analysisRunId: run[0].id,
          filePath: 'src/bar.js',
          fileType: 'javascript',
          originalSize: 200,
          bundledSize: 200,
        },
      ]);

      const result = await getModulesByAnalysis(run[0].id);

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.items.map((m) => m.filePath)).toContain('src/foo.js');
      expect(result.items.map((m) => m.filePath)).toContain('src/bar.js');
    });

    it('should filter by file type', async () => {
      const run = await db
        .insert(schema.analysisRun)
        .values({
          projectName: 'test-project',
          bundler: 'webpack',
        })
        .returning();

      await db.insert(schema.module).values([
        {
          analysisRunId: run[0].id,
          filePath: 'src/foo.js',
          fileType: 'javascript',
          originalSize: 100,
          bundledSize: 100,
        },
        {
          analysisRunId: run[0].id,
          filePath: 'src/bar.css',
          fileType: 'css',
          originalSize: 50,
          bundledSize: 50,
        },
      ]);

      const result = await getModulesByAnalysis(run[0].id, { fileType: 'javascript' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].fileType).toBe('javascript');
    });

    it('should filter by third-party status', async () => {
      const run = await db
        .insert(schema.analysisRun)
        .values({
          projectName: 'test-project',
          bundler: 'webpack',
        })
        .returning();

      await db.insert(schema.module).values([
        {
          analysisRunId: run[0].id,
          filePath: 'src/foo.js',
          fileType: 'javascript',
          originalSize: 100,
          bundledSize: 100,
          isThirdParty: false,
        },
        {
          analysisRunId: run[0].id,
          filePath: 'node_modules/react/index.js',
          fileType: 'javascript',
          originalSize: 200,
          bundledSize: 200,
          isThirdParty: true,
        },
      ]);

      const result = await getModulesByAnalysis(run[0].id, { isThirdParty: true });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].isThirdParty).toBe(true);
    });

    it('should search in file path', async () => {
      const run = await db
        .insert(schema.analysisRun)
        .values({
          projectName: 'test-project',
          bundler: 'webpack',
        })
        .returning();

      await db.insert(schema.module).values([
        {
          analysisRunId: run[0].id,
          filePath: 'src/components/Button.js',
          fileType: 'javascript',
          originalSize: 100,
          bundledSize: 100,
        },
        {
          analysisRunId: run[0].id,
          filePath: 'src/utils/helpers.js',
          fileType: 'javascript',
          originalSize: 200,
          bundledSize: 200,
        },
      ]);

      const result = await getModulesByAnalysis(run[0].id, { search: 'components' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].filePath).toContain('components');
    });

    it('should sort by bundled size', async () => {
      const run = await db
        .insert(schema.analysisRun)
        .values({
          projectName: 'test-project',
          bundler: 'webpack',
        })
        .returning();

      await db.insert(schema.module).values([
        {
          analysisRunId: run[0].id,
          filePath: 'src/small.js',
          fileType: 'javascript',
          originalSize: 100,
          bundledSize: 100,
        },
        {
          analysisRunId: run[0].id,
          filePath: 'src/large.js',
          fileType: 'javascript',
          originalSize: 200,
          bundledSize: 300,
        },
      ]);

      const result = await getModulesByAnalysis(run[0].id, {
        sortBy: 'bundledSize',
        sortOrder: 'desc',
      });

      expect(result.items[0].filePath).toBe('src/large.js');
      expect(result.items[1].filePath).toBe('src/small.js');
    });

    it('should paginate results', async () => {
      const run = await db
        .insert(schema.analysisRun)
        .values({
          projectName: 'test-project',
          bundler: 'webpack',
        })
        .returning();

      await db.insert(schema.module).values(
        Array.from({ length: 10 }, (_, i) => ({
          analysisRunId: run[0].id,
          filePath: `src/file${i}.js`,
          fileType: 'javascript',
          originalSize: 100,
          bundledSize: 100,
        })),
      );

      const result = await getModulesByAnalysis(run[0].id, { page: 1, pageSize: 5 });

      expect(result.items).toHaveLength(5);
      expect(result.total).toBe(10);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(5);
      expect(result.totalPages).toBe(2);
    });

    it('should parse JSON exports fields', async () => {
      const run = await db
        .insert(schema.analysisRun)
        .values({
          projectName: 'test-project',
          bundler: 'webpack',
        })
        .returning();

      await db.insert(schema.module).values({
        analysisRunId: run[0].id,
        filePath: 'src/foo.js',
        fileType: 'javascript',
        originalSize: 100,
        bundledSize: 100,
        exports: JSON.stringify(['foo', 'bar']),
        usedExports: JSON.stringify(['foo']),
      });

      const result = await getModulesByAnalysis(run[0].id);

      expect(result.items[0].exports).toEqual(['foo', 'bar']);
      expect(result.items[0].usedExports).toEqual(['foo']);
    });
  });

  describe('getSymbolsByModule', () => {
    it('should return empty array for non-existent module', async () => {
      const result = await getSymbolsByModule(999);
      expect(result).toHaveLength(0);
    });

    it('should return symbols for module', async () => {
      const run = await db
        .insert(schema.analysisRun)
        .values({
          projectName: 'test-project',
          bundler: 'webpack',
        })
        .returning();

      const module = await db
        .insert(schema.module)
        .values({
          analysisRunId: run[0].id,
          filePath: 'src/foo.js',
          fileType: 'javascript',
          originalSize: 100,
          bundledSize: 100,
        })
        .returning();

      await db.insert(schema.symbol).values([
        {
          moduleId: module[0].id,
          name: 'foo',
          type: 'function',
          sourceStartLine: 1,
          sourceStartCol: 0,
          sourceEndLine: 5,
          sourceEndCol: 10,
          isExported: true,
        },
        {
          moduleId: module[0].id,
          name: 'bar',
          type: 'variable',
          sourceStartLine: 7,
          sourceStartCol: 0,
          sourceEndLine: 7,
          sourceEndCol: 10,
          isExported: false,
        },
      ]);

      const result = await getSymbolsByModule(module[0].id);

      expect(result).toHaveLength(2);
      expect(result.map((s) => s.name)).toContain('foo');
      expect(result.map((s) => s.name)).toContain('bar');
      expect(result[0].sourceStartLine).toBeLessThanOrEqual(result[1].sourceStartLine);
    });
  });

  describe('getDependencyGraph', () => {
    it('should return empty graph for non-existent analysis', async () => {
      const result = await getDependencyGraph(999);
      expect(result.size).toBe(0);
    });

    it('should build dependency graph', async () => {
      const run = await db
        .insert(schema.analysisRun)
        .values({
          projectName: 'test-project',
          bundler: 'webpack',
        })
        .returning();

      const modules = await db
        .insert(schema.module)
        .values([
          {
            analysisRunId: run[0].id,
            filePath: 'src/a.js',
            fileType: 'javascript',
            originalSize: 100,
            bundledSize: 100,
          },
          {
            analysisRunId: run[0].id,
            filePath: 'src/b.js',
            fileType: 'javascript',
            originalSize: 200,
            bundledSize: 200,
          },
          {
            analysisRunId: run[0].id,
            filePath: 'src/c.js',
            fileType: 'javascript',
            originalSize: 300,
            bundledSize: 300,
          },
        ])
        .returning();

      // a -> b, b -> c
      await db.insert(schema.dependency).values([
        {
          analysisRunId: run[0].id,
          importerModuleId: modules[0].id,
          importedModuleId: modules[1].id,
          importType: 'static',
          importedSymbols: JSON.stringify(['foo']),
        },
        {
          analysisRunId: run[0].id,
          importerModuleId: modules[1].id,
          importedModuleId: modules[2].id,
          importType: 'static',
          importedSymbols: JSON.stringify(['bar']),
        },
      ]);

      const graph = await getDependencyGraph(run[0].id);

      expect(graph.size).toBe(3);

      const nodeA = graph.get(modules[0].id);
      expect(nodeA).toBeDefined();
      expect(nodeA?.dependencies).toHaveLength(1);
      expect(nodeA?.dependencies[0].targetPath).toBe('src/b.js');

      const nodeB = graph.get(modules[1].id);
      expect(nodeB).toBeDefined();
      expect(nodeB?.dependencies).toHaveLength(1);
      expect(nodeB?.dependents).toHaveLength(1);
      expect(nodeB?.dependencies[0].targetPath).toBe('src/c.js');
      expect(nodeB?.dependents[0].targetPath).toBe('src/a.js');

      const nodeC = graph.get(modules[2].id);
      expect(nodeC).toBeDefined();
      expect(nodeC?.dependents).toHaveLength(1);
      expect(nodeC?.dependents[0].targetPath).toBe('src/b.js');
    });
  });

  describe('compareAnalyses', () => {
    it('should return null if either analysis not found', async () => {
      const run = await db
        .insert(schema.analysisRun)
        .values({
          projectName: 'test-project',
          bundler: 'webpack',
        })
        .returning();

      const result = await compareAnalyses(run[0].id, 999);
      expect(result).toBeNull();
    });

    it('should compare two analyses', async () => {
      const run1 = await db
        .insert(schema.analysisRun)
        .values({
          projectName: 'test-project',
          bundler: 'webpack',
        })
        .returning();

      const run2 = await db
        .insert(schema.analysisRun)
        .values({
          projectName: 'test-project',
          bundler: 'webpack',
        })
        .returning();

      await db.insert(schema.module).values([
        {
          analysisRunId: run1[0].id,
          filePath: 'src/foo.js',
          fileType: 'javascript',
          originalSize: 100,
          bundledSize: 100,
        },
        {
          analysisRunId: run1[0].id,
          filePath: 'src/bar.js',
          fileType: 'javascript',
          originalSize: 200,
          bundledSize: 200,
        },
      ]);

      await db.insert(schema.module).values([
        {
          analysisRunId: run2[0].id,
          filePath: 'src/foo.js',
          fileType: 'javascript',
          originalSize: 100,
          bundledSize: 150, // Changed size
          exports: JSON.stringify(['foo', 'baz']), // Changed exports
        },
        {
          analysisRunId: run2[0].id,
          filePath: 'src/baz.js', // New module
          fileType: 'javascript',
          originalSize: 300,
          bundledSize: 300,
        },
        // bar.js removed
      ]);

      await db.insert(schema.bundle).values([
        {
          analysisRunId: run1[0].id,
          fileName: 'main.js',
          fileType: 'javascript',
          size: 1000,
          gzipSize: 500,
        },
        {
          analysisRunId: run2[0].id,
          fileName: 'main.js',
          fileType: 'javascript',
          size: 1200,
          gzipSize: 600,
        },
        {
          analysisRunId: run2[0].id,
          fileName: 'vendor.js', // New bundle
          fileType: 'javascript',
          size: 500,
          gzipSize: 250,
        },
      ]);

      const result = await compareAnalyses(run1[0].id, run2[0].id);

      expect(result).not.toBeNull();
      expect(result?.moduleDiff.added).toHaveLength(1);
      expect(result?.moduleDiff.added[0].filePath).toBe('src/baz.js');
      expect(result?.moduleDiff.removed).toHaveLength(1);
      expect(result?.moduleDiff.removed[0].filePath).toBe('src/bar.js');
      expect(result?.moduleDiff.modified).toHaveLength(1);
      expect(result?.moduleDiff.modified[0].module.filePath).toBe('src/foo.js');
      expect(result?.moduleDiff.modified[0].sizeDelta).toBe(50);
      expect(result?.moduleDiff.modified[0].exportsChanged).toBe(true);
      expect(result?.sizeDelta.totalSize).toBe(700); // 1700 - 1000
      expect(result?.bundleDiff.added).toBe(1);
      expect(result?.bundleDiff.modified).toBe(1);
    });
  });
});
