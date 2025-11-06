/**
 * Tests for Angular adapter
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AngularAdapter } from './adapter.js';
import type { BundlerPluginOptions } from '../types.js';
import * as fs from 'node:fs';

// Mock file system functions
vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
  return {
    ...actual,
    readFileSync: vi.fn(),
    readdirSync: vi.fn(),
    statSync: vi.fn(),
    existsSync: vi.fn(),
  };
});

describe('AngularAdapter', () => {
  const baseDir = '/project';
  const options: BundlerPluginOptions = {
    projectName: 'test-angular-app',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('extract', () => {
    it('should return empty result for invalid input', () => {
      const adapter = new AngularAdapter(baseDir, options);
      const result = adapter.extract(null);

      expect(result.bundles).toEqual([]);
      expect(result.modules).toEqual([]);
      expect(result.chunks).toEqual([]);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Invalid Angular build output');
    });

    it('should extract bundles from Angular build output with stats.json', () => {
      const adapter = new AngularAdapter(baseDir, options);

      const mockStats = {
        chunks: [
          {
            id: 'main',
            names: ['main'],
            files: ['main.js'],
            entry: true,
            initial: true,
            async: false,
            modules: [
              {
                id: 'src/main.ts',
                identifier: '/project/src/main.ts',
                name: 'src/main.ts',
                size: 1024,
              },
            ],
          },
        ],
        modules: [
          {
            identifier: '/project/src/main.ts',
            name: 'src/main.ts',
            size: 1024,
            chunks: ['main'],
          },
        ],
        assets: [
          {
            name: 'main.js',
            size: 2048,
            chunks: ['main'],
          },
        ],
      };

      // Mock readFileSync for bundle content
      vi.mocked(fs.readFileSync).mockReturnValue('console.log("Angular app");');

      const angularOutput = {
        outputPath: '/project/dist/test-angular-app',
        stats: mockStats,
        isSSR: false,
      };

      const result = adapter.extract(angularOutput);

      expect(result.bundles).toHaveLength(1);
      expect(result.bundles[0].fileName).toBe('main.js');
      expect(result.bundles[0].content).toBe('console.log("Angular app");');
      expect(result.modules).toHaveLength(1);
      expect(result.chunks).toHaveLength(1);
      expect(result.chunks[0].name).toBe('main');
      expect(result.chunks[0].isEntry).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should handle lazy-loaded chunks', () => {
      const adapter = new AngularAdapter(baseDir, options);

      const mockStats = {
        chunks: [
          {
            id: 'main',
            names: ['main'],
            files: ['main.js'],
            entry: true,
            initial: true,
            async: false,
            modules: [{ id: 'src/main.ts', identifier: 'src/main.ts', name: 'src/main.ts', size: 1024 }],
          },
          {
            id: 'lazy',
            names: ['lazy-module'],
            files: ['lazy-module.js'],
            entry: false,
            initial: false,
            async: true,
            modules: [{ id: 'src/lazy.ts', identifier: 'src/lazy.ts', name: 'src/lazy.ts', size: 512 }],
          },
        ],
        modules: [
          { identifier: 'src/main.ts', name: 'src/main.ts', size: 1024, chunks: ['main'] },
          { identifier: 'src/lazy.ts', name: 'src/lazy.ts', size: 512, chunks: ['lazy'] },
        ],
        assets: [
          { name: 'main.js', size: 2048, chunks: ['main'] },
          { name: 'lazy-module.js', size: 768, chunks: ['lazy'] },
        ],
      };

      vi.mocked(fs.readFileSync).mockReturnValue('// bundle content');

      const angularOutput = {
        outputPath: '/project/dist/test-angular-app',
        stats: mockStats,
        isSSR: false,
      };

      const result = adapter.extract(angularOutput);

      expect(result.chunks).toHaveLength(2);
      
      const lazyChunk = result.chunks.find((c) => c.name === 'lazy-module');
      expect(lazyChunk).toBeDefined();
      expect(lazyChunk?.isAsync).toBe(true);
      expect(lazyChunk?.isEntry).toBe(false);

      const mainChunk = result.chunks.find((c) => c.name === 'main');
      expect(mainChunk).toBeDefined();
      expect(mainChunk?.isAsync).toBe(false);
      expect(mainChunk?.isEntry).toBe(true);
    });

    it('should fallback to directory scan when stats.json is missing', () => {
      const adapter = new AngularAdapter(baseDir, options);

      // Mock file system for directory scan
      vi.mocked(fs.readFileSync)
        .mockReturnValueOnce('') // First call for stats.json (will throw)
        .mockReturnValueOnce('console.log("main");') // main.js
        .mockReturnValueOnce('console.log("polyfills");'); // polyfills.js

      vi.mocked(fs.readdirSync).mockReturnValue(['main.js', 'polyfills.js'] as any);
      vi.mocked(fs.statSync).mockReturnValue({ isFile: () => true, size: 1024 } as any);

      const angularOutput = {
        outputPath: '/project/dist/test-angular-app',
        isSSR: false,
      };

      const result = adapter.extract(angularOutput);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('No stats.json found');
      expect(result.bundles.length).toBeGreaterThan(0);
    });

    it('should extract source maps when enabled', () => {
      const adapter = new AngularAdapter(baseDir, {
        ...options,
        extractSourceMaps: true,
      });

      const mockStats = {
        chunks: [],
        modules: [],
        assets: [
          {
            name: 'main.js',
            size: 2048,
            chunks: ['main'],
          },
        ],
      };

      const bundleContent = 'console.log("test");\n//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozfQ==';
      
      vi.mocked(fs.readFileSync).mockReturnValue(bundleContent);

      const angularOutput = {
        outputPath: '/project/dist/test-angular-app',
        stats: mockStats,
        isSSR: false,
      };

      const result = adapter.extract(angularOutput);

      expect(result.bundles).toHaveLength(1);
      expect(result.bundles[0].sourceMapReference).toBeDefined();
    });

    it('should filter modules based on excludePatterns', () => {
      const adapter = new AngularAdapter(baseDir, {
        ...options,
        excludePatterns: ['**/node_modules/**'],
      });

      const mockStats = {
        chunks: [],
        modules: [
          {
            identifier: '/project/src/main.ts',
            name: 'src/main.ts',
            size: 1024,
          },
          {
            identifier: '/project/node_modules/rxjs/index.js',
            name: 'node_modules/rxjs/index.js',
            size: 5000,
          },
        ],
        assets: [],
      };

      const angularOutput = {
        outputPath: '/project/dist/test-angular-app',
        stats: mockStats,
        isSSR: false,
      };

      const result = adapter.extract(angularOutput);

      // node_modules should be excluded
      expect(result.modules.length).toBeLessThan(2);
      expect(result.modules.every((m) => !m.filePath.includes('node_modules'))).toBe(true);
    });

    it('should handle SSR builds', () => {
      const adapter = new AngularAdapter(baseDir, options);

      const mockStats = {
        chunks: [],
        modules: [],
        assets: [
          {
            name: 'server.js',
            size: 3000,
            chunks: ['server'],
          },
        ],
      };

      vi.mocked(fs.readFileSync).mockReturnValue('// SSR bundle');

      const angularOutput = {
        outputPath: '/project/dist/test-angular-app/server',
        stats: mockStats,
        isSSR: true,
      };

      const result = adapter.extract(angularOutput);

      expect(result.bundles).toHaveLength(1);
      expect(result.bundles[0].fileName).toBe('server.js');
      expect(result.options.bundlerType).toBe('other'); // SSR uses 'other'
    });

    it('should handle empty stats gracefully', () => {
      const adapter = new AngularAdapter(baseDir, options);

      const emptyStats = {
        chunks: [],
        modules: [],
        assets: [],
      };

      const angularOutput = {
        outputPath: '/project/dist/test-angular-app',
        stats: emptyStats,
        isSSR: false,
      };

      const result = adapter.extract(angularOutput);

      expect(result.bundles).toEqual([]);
      expect(result.modules).toEqual([]);
      expect(result.chunks).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it('should handle read errors gracefully', () => {
      const adapter = new AngularAdapter(baseDir, options);

      const mockStats = {
        chunks: [],
        modules: [],
        assets: [
          {
            name: 'main.js',
            size: 2048,
            chunks: ['main'],
          },
        ],
      };

      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('File not found');
      });

      const angularOutput = {
        outputPath: '/project/dist/test-angular-app',
        stats: mockStats,
        isSSR: false,
      };

      const result = adapter.extract(angularOutput);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.includes('Failed to read bundle'))).toBe(true);
    });
  });
});
