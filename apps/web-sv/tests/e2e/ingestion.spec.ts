/**
 * End-to-end tests for bundle ingestion flow
 * Tests the complete flow from bundle input to database persistence
 */

import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { ingestBundle, type BundleIngestionInput } from '../../src/lib/server/ingestion/index.js';
import type { BundleInput, ModuleInput, ChunkInput } from '@smappy/core';

test.describe('Bundle Ingestion E2E', () => {
  test('should ingest example bundle with source map', async () => {
    // Read the example bundle and source map from test fixtures
    const exampleBundlesPath = new URL('../../../../examples/bundles/', import.meta.url);
    const bundlePath = new URL('example-bundle.js', exampleBundlesPath);
    const sourceMapPath = new URL('example-bundle.js.map', exampleBundlesPath);

    const bundleContent = await readFile(bundlePath, 'utf-8');
    let sourceMapContent: string | undefined;
    try {
      sourceMapContent = await readFile(sourceMapPath, 'utf-8');
    } catch {
      // Source map is optional
    }

    // Create test modules
    const modules: ModuleInput[] = [
      {
        filePath: './src/calculator.js',
        sourceContent: `
export class Calculator {
  constructor() {
    this.result = 0;
  }

  add(value) {
    this.result += value;
    return this;
  }

  getResult() {
    return this.result;
  }
}

export function add(a, b) {
  return a + b;
}
        `.trim(),
        fileType: 'js',
      },
    ];

    // Create bundle input
    const bundles: BundleInput[] = [
      {
        fileName: 'example-bundle.js',
        content: bundleContent,
        type: 'js',
        sourceMapReference: sourceMapContent,
      },
    ];

    // Create chunk input
    const chunks: ChunkInput[] = [
      {
        name: 'main',
        isEntry: true,
        isAsync: false,
        moduleIds: ['./src/calculator.js'],
      },
    ];

    // Create ingestion input
    const input: BundleIngestionInput = {
      options: {
        bundlerType: 'webpack',
        projectName: 'e2e-test-project',
      },
      bundles,
      modules,
      chunks,
    };

    // Perform ingestion
    const result = await ingestBundle(input);

    // Verify ingestion completed successfully
    expect(result.analysisRunId).toBeGreaterThan(0);
    expect(result.stats.modulesWritten).toBeGreaterThan(0);
    expect(result.stats.symbolsWritten).toBeGreaterThan(0);
    expect(result.stats.bundlesWritten).toBe(1);
    expect(result.stats.chunksWritten).toBe(1);
    expect(result.errors).toHaveLength(0);
  });

  test('should ingest multiple bundles and modules', async () => {
    const modules: ModuleInput[] = [
      {
        filePath: './src/utils/helpers.js',
        sourceContent: `
export function formatDate(date) {
  return date.toISOString();
}

export function formatCurrency(amount) {
  return \`$\${amount.toFixed(2)}\`;
}
        `.trim(),
        fileType: 'js',
      },
      {
        filePath: './src/components/Button.js',
        sourceContent: `
import { formatCurrency } from '../utils/helpers.js';

export class Button {
  constructor(text, price) {
    this.text = text;
    this.price = price;
  }

  render() {
    return \`<button>\${this.text} - \${formatCurrency(this.price)}</button>\`;
  }
}
        `.trim(),
        fileType: 'js',
      },
      {
        filePath: './src/index.js',
        sourceContent: `
import { Button } from './components/Button.js';

const button = new Button('Buy Now', 9.99);
console.log(button.render());
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
      {
        fileName: 'vendor.js',
        content: '/* vendor code */',
        type: 'js',
      },
    ];

    const chunks: ChunkInput[] = [
      {
        name: 'main',
        isEntry: true,
        isAsync: false,
        moduleIds: ['./src/index.js', './src/components/Button.js', './src/utils/helpers.js'],
      },
      {
        name: 'vendor',
        isEntry: false,
        isAsync: false,
        moduleIds: [],
      },
    ];

    const input: BundleIngestionInput = {
      options: {
        bundlerType: 'vite',
        projectName: 'e2e-test-multi-bundle',
      },
      bundles,
      modules,
      chunks,
    };

    const result = await ingestBundle(input);

    expect(result.analysisRunId).toBeGreaterThan(0);
    expect(result.stats.modulesWritten).toBe(3);
    expect(result.stats.bundlesWritten).toBe(2);
    expect(result.stats.chunksWritten).toBe(2);
    expect(result.stats.dependenciesWritten).toBeGreaterThan(0); // Should have dependencies between modules
    expect(result.errors).toHaveLength(0);
  });
});
