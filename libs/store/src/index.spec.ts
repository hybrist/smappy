/**
 * Tests for the store package
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createStore } from './index.ts';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { unlinkSync, existsSync } from 'node:fs';

describe('createStore', () => {
  let testDbPath: string;
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    // Use a temporary database file for each test
    testDbPath = join(
      tmpdir(),
      `smappy-test-${Date.now()}-${Math.random()}.db`,
    );
    store = createStore({ dbPath: testDbPath, autoMigrate: true });
  });

  afterEach(() => {
    // Clean up test database
    if (store) {
      store.close();
    }
    if (existsSync(testDbPath)) {
      try {
        unlinkSync(testDbPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  it('should create a store instance', () => {
    expect(store).toBeDefined();
    expect(store.db).toBeDefined();
    expect(typeof store.listAnalysisRuns).toBe('function');
    expect(typeof store.getLatestAnalysisRun).toBe('function');
    expect(typeof store.saveAnalysisRun).toBe('function');
    expect(typeof store.pruneAnalysisRuns).toBe('function');
    expect(typeof store.close).toBe('function');
  });

  it('should save and retrieve analysis runs', () => {
    const result = store.saveAnalysisRun({
      projectName: 'test-project',
      bundler: 'vite',
      bundles: [
        {
          fileName: 'main.js',
          fileType: 'javascript',
          size: 1024,
          gzipSize: 512,
        },
      ],
      modules: [
        {
          filePath: 'src/index.ts',
          fileType: 'javascript',
          originalSize: 512,
          bundledSize: 256,
          isThirdParty: false,
        },
      ],
      chunks: [
        {
          name: 'main',
          totalSize: 1024,
          isEntry: true,
          isAsync: false,
        },
      ],
    });

    expect(result.analysisRunId).toBeGreaterThan(0);
    expect(result.stats.bundlesWritten).toBe(1);
    expect(result.stats.modulesWritten).toBe(1);
    expect(result.stats.chunksWritten).toBe(1);

    const latest = store.getLatestAnalysisRun('test-project');
    expect(latest).not.toBeNull();
    expect(latest?.projectName).toBe('test-project');
    expect(latest?.bundler).toBe('vite');
    expect(latest?.bundleCount).toBe(1);
    expect(latest?.moduleCount).toBe(1);
  });

  it('should list analysis runs with filtering', () => {
    // Save multiple runs
    store.saveAnalysisRun({
      projectName: 'project-a',
      bundler: 'vite',
    });

    store.saveAnalysisRun({
      projectName: 'project-a',
      bundler: 'webpack',
    });

    store.saveAnalysisRun({
      projectName: 'project-b',
      bundler: 'rollup',
    });

    // List all runs
    const allRuns = store.listAnalysisRuns();
    expect(allRuns.length).toBe(3);

    // Filter by project name
    const projectARuns = store.listAnalysisRuns({ projectName: 'project-a' });
    expect(projectARuns.length).toBe(2);

    // Test limit
    const limited = store.listAnalysisRuns({ limit: 1 });
    expect(limited.length).toBe(1);
  });

  it('should get latest analysis run', () => {
    store.saveAnalysisRun({
      projectName: 'test-project',
      bundler: 'vite',
    });

    store.saveAnalysisRun({
      projectName: 'test-project',
      bundler: 'webpack',
    });

    const latest = store.getLatestAnalysisRun('test-project');
    expect(latest).not.toBeNull();
    expect(latest?.bundler).toBe('webpack');
  });

  it('should prune old analysis runs', () => {
    // Create multiple runs
    for (let i = 0; i < 10; i++) {
      store.saveAnalysisRun({
        projectName: 'test-project',
        bundler: 'vite',
      });
    }

    const allRuns = store.listAnalysisRuns({ projectName: 'test-project' });
    expect(allRuns.length).toBe(10);

    // Prune, keeping minimum of 5
    const deleted = store.pruneAnalysisRuns({ keepMinimum: 5 });
    expect(deleted).toBe(5);

    const remainingRuns = store.listAnalysisRuns({
      projectName: 'test-project',
    });
    expect(remainingRuns.length).toBe(5);
  });

  it('should handle empty results gracefully', () => {
    const latest = store.getLatestAnalysisRun('non-existent');
    expect(latest).toBeNull();

    const runs = store.listAnalysisRuns({ projectName: 'non-existent' });
    expect(runs.length).toBe(0);
  });

  it('should use default database path from environment', () => {
    const originalEnv = process.env.SMAPPY_DB_PATH;

    try {
      process.env.SMAPPY_DB_PATH = testDbPath;
      const envStore = createStore();

      expect(envStore).toBeDefined();
      envStore.close();
    } finally {
      if (originalEnv) {
        process.env.SMAPPY_DB_PATH = originalEnv;
      } else {
        delete process.env.SMAPPY_DB_PATH;
      }
    }
  });
});
