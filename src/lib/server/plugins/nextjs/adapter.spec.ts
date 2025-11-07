/**
 * Tests for Next.js adapter
 */

import { describe, it, expect } from 'vitest';
import type { Compilation, Stats } from 'webpack';
import { NextJsAdapter, sanitizeModuleIdentifier } from './adapter.js';
import type { NextJsAdapterOptions } from './adapter.js';

describe('NextJsAdapter', () => {
  const baseDir = '/project';
  const baseOptions: NextJsAdapterOptions = {
    projectName: 'test-next-app',
    buildTarget: 'client',
  };

  it('should report errors for invalid input and set bundler type to nextjs', () => {
    const adapter = new NextJsAdapter(baseDir, baseOptions);
    const result = adapter.extract(null);

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.options.bundlerType).toBe('nextjs');
  });

  it('should sanitize Next.js module identifiers and chunk metadata', () => {
    const adapter = new NextJsAdapter(baseDir, baseOptions);

    const mockStats = {
      toJson: () => ({
        modules: [
          {
            identifier: './app/page.tsx?__next_rsc__',
            name: './app/page.tsx?__next_rsc__',
            size: 420,
            reasons: [],
          },
          {
            identifier:
              'next-flight-client-entry-loader?modules=app%2Fproducts%2F%5Bid%5D%2Fpage.tsx',
            name: 'next-flight-client-entry-loader?modules=app%2Fproducts%2F%5Bid%5D%2Fpage.tsx',
            size: 1024,
            reasons: [],
          },
        ],
        chunks: [
          {
            id: 0,
            names: ['app/page'],
            files: ['static/chunks/app/page.js'],
            modules: [
              {
                identifier: './app/page.tsx?__next_rsc__',
                name: './app/page.tsx?__next_rsc__',
              },
              {
                identifier:
                  'next-flight-client-entry-loader?modules=app%2Fproducts%2F%5Bid%5D%2Fpage.tsx',
                name: 'next-flight-client-entry-loader?modules=app%2Fproducts%2F%5Bid%5D%2Fpage.tsx',
              },
            ],
            entry: true,
            initial: true,
            async: false,
            size: 1440,
          },
        ],
        assets: [
          {
            name: 'static/chunks/app/page.js',
            size: 3500,
          },
        ],
      }),
      compilation: {} as Compilation,
    } as unknown as Stats;

    const nextOutput = {
      stats: mockStats,
      compilation: mockStats.compilation,
      outputPath: '/project/.next',
    };

    const result = adapter.extract(nextOutput);

    expect(result.options.bundlerType).toBe('nextjs');
    expect(result.errors).toEqual([]);

    const modulePaths = result.modules.map((module) => module.filePath);
    expect(modulePaths).toContain('project/app/page.tsx');
    expect(modulePaths).toContain('project/app/products/[id]/page.tsx');

    const chunk = result.chunks[0];
    expect(chunk.moduleIds).toContain('project/app/page.tsx');
    expect(chunk.moduleIds).toContain('project/app/products/[id]/page.tsx');

    const bundle = result.bundles[0];
    expect(bundle.fileName).toBe('static/chunks/app/page.js');
  });

  it('should normalize identifiers exported from helper function', () => {
    expect(
      sanitizeModuleIdentifier(
        'next-client-pages-loader?absolutePagePath=%2Fproject%2Fpages%2Fapi%2Fhello.ts&page=/api/hello',
      ),
    ).toBe('project/pages/api/hello.ts');
  });
});
