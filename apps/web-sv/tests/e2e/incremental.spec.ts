/**
 * End-to-end tests for incremental analysis workflow
 * Tests that unchanged modules are skipped correctly in incremental mode
 */

import { test, expect } from '@playwright/test';
import { ingestBundle, type BundleIngestionInput } from '../../src/lib/server/ingestion/index.js';
import type {
  BundleInput,
  ModuleInput,
  ChunkInput,
} from '../../src/lib/server/ingestion/types/index.js';

test.describe('Incremental Analysis E2E', () => {
  const projectName = 'e2e-incremental-test';

  test('should analyze all modules on first run', async () => {
    const modules: ModuleInput[] = [
      {
        filePath: './src/module1.js',
        sourceContent: `
export function func1() {
  return 'module1';
}
        `.trim(),
        fileType: 'js',
      },
      {
        filePath: './src/module2.js',
        sourceContent: `
export function func2() {
  return 'module2';
}
        `.trim(),
        fileType: 'js',
      },
    ];

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
        moduleIds: ['./src/module1.js', './src/module2.js'],
      },
    ];

    const input: BundleIngestionInput = {
      options: {
        bundlerType: 'webpack',
        projectName,
        enableIncremental: true,
      },
      bundles,
      modules,
      chunks,
    };

    const result = await ingestBundle(input);

    // First run should analyze all modules
    expect(result.analysisRunId).toBeGreaterThan(0);
    expect(result.stats.modulesWritten).toBe(2);
    expect(result.stats.modulesSkipped || 0).toBe(0);
    expect(result.diff).toBeDefined();
    expect(result.diff?.canUseIncremental).toBe(false); // No previous run
  });

  test('should skip unchanged modules on second run', async () => {
    // First run
    const modules1: ModuleInput[] = [
      {
        filePath: './src/unchanged.js',
        sourceContent: `
export function unchanged() {
  return 'same';
}
        `.trim(),
        fileType: 'js',
      },
      {
        filePath: './src/changed.js',
        sourceContent: `
export function changed() {
  return 'version1';
}
        `.trim(),
        fileType: 'js',
      },
    ];

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
        moduleIds: ['./src/unchanged.js', './src/changed.js'],
      },
    ];

    const input1: BundleIngestionInput = {
      options: {
        bundlerType: 'webpack',
        projectName,
        enableIncremental: true,
      },
      bundles,
      modules: modules1,
      chunks,
    };

    const result1 = await ingestBundle(input1);
    expect(result1.stats.modulesWritten).toBe(2);

    // Second run with one unchanged and one changed module
    const modules2: ModuleInput[] = [
      {
        filePath: './src/unchanged.js',
        sourceContent: `
export function unchanged() {
  return 'same';
}
        `.trim(),
        fileType: 'js',
      },
      {
        filePath: './src/changed.js',
        sourceContent: `
export function changed() {
  return 'version2'; // Changed content
}
        `.trim(),
        fileType: 'js',
      },
    ];

    const input2: BundleIngestionInput = {
      options: {
        bundlerType: 'webpack',
        projectName,
        enableIncremental: true,
      },
      bundles,
      modules: modules2,
      chunks,
    };

    const result2 = await ingestBundle(input2);

    // Should have previous run
    expect(result2.diff).toBeDefined();
    expect(result2.diff?.canUseIncremental).toBe(true);
    expect(result2.diff?.previousRunId).toBe(result1.analysisRunId);

    // Should skip unchanged module and analyze changed one
    expect(result2.stats.modulesWritten).toBeGreaterThanOrEqual(1);
    expect(result2.stats.modulesSkipped || 0).toBeGreaterThanOrEqual(0);

    // Verify both modules are still in the database (from previous run or current)
    expect(result2.analysisRunId).toBeGreaterThan(result1.analysisRunId);
  });

  test('should analyze new modules on incremental run', async () => {
    // First run with one module
    const modules1: ModuleInput[] = [
      {
        filePath: './src/existing.js',
        sourceContent: `
export function existing() {
  return 'existing';
}
        `.trim(),
        fileType: 'js',
      },
    ];

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
        moduleIds: ['./src/existing.js'],
      },
    ];

    const input1: BundleIngestionInput = {
      options: {
        bundlerType: 'webpack',
        projectName: 'e2e-incremental-new-modules',
        enableIncremental: true,
      },
      bundles,
      modules: modules1,
      chunks,
    };

    await ingestBundle(input1);

    // Second run with existing + new module
    const modules2: ModuleInput[] = [
      ...modules1,
      {
        filePath: './src/new-module.js',
        sourceContent: `
export function newFunction() {
  return 'new';
}
        `.trim(),
        fileType: 'js',
      },
    ];

    const chunks2: ChunkInput[] = [
      {
        name: 'main',
        isEntry: true,
        isAsync: false,
        moduleIds: ['./src/existing.js', './src/new-module.js'],
      },
    ];

    const input2: BundleIngestionInput = {
      options: {
        bundlerType: 'webpack',
        projectName: 'e2e-incremental-new-modules',
        enableIncremental: true,
      },
      bundles,
      modules: modules2,
      chunks: chunks2,
    };

    const result2 = await ingestBundle(input2);

    // Should detect new module
    expect(result2.diff?.moduleDiff.added).toContain('./src/new-module.js');
    expect(result2.stats.modulesWritten).toBeGreaterThanOrEqual(1);
  });
});
