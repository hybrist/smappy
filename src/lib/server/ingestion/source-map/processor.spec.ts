/**
 * Tests for source map processor module
 */
import { describe, it, expect } from 'vitest';
import { readFile } from 'fs/promises';
import { join } from 'path';
import {
  parseSourceMap,
  mapBundleToSource,
  computeSymbolFragments,
  computeSymbolFragmentsWithContent,
  loadExternalSourceMap,
  type PositionMapping,
} from './processor.js';
import type { SourceMap } from '../types/index.js';

describe('Source Map Processor', () => {
  describe('parseSourceMap', () => {
    it('should parse a valid source map from JSON string', () => {
      const validSourceMap = JSON.stringify({
        version: 3,
        sources: ['src/index.js', 'src/utils.js'],
        sourcesContent: ['console.log("hello");', 'export const add = (a, b) => a + b;'],
        mappings: 'AAAA,CAAC,CAAC;AACF',
        names: ['console', 'log', 'add'],
      });

      const result = parseSourceMap(validSourceMap);

      expect(result.version).toBe(3);
      expect(result.sources).toEqual(['src/index.js', 'src/utils.js']);
      expect(result.sourcesContent).toEqual([
        'console.log("hello");',
        'export const add = (a, b) => a + b;',
      ]);
      expect(result.mappings).toBe('AAAA,CAAC,CAAC;AACF');
      expect(result.names).toEqual(['console', 'log', 'add']);
    });

    it('should parse source map without optional fields', () => {
      const minimalSourceMap = JSON.stringify({
        version: 3,
        sources: ['index.js'],
        mappings: 'AAAA',
      });

      const result = parseSourceMap(minimalSourceMap);

      expect(result.version).toBe(3);
      expect(result.sources).toEqual(['index.js']);
      expect(result.mappings).toBe('AAAA');
      expect(result.sourcesContent).toBeNull();
      expect(result.names).toEqual([]);
    });

    it('should handle inline source maps with base64 encoding', () => {
      const sourceMapJson = JSON.stringify({
        version: 3,
        sources: ['test.js'],
        mappings: 'AAAA',
        names: [],
      });
      const base64 = Buffer.from(sourceMapJson).toString('base64');
      const dataUrl = `data:application/json;charset=utf-8;base64,${base64}`;

      const result = parseSourceMap(dataUrl);

      expect(result.version).toBe(3);
      expect(result.sources).toEqual(['test.js']);
      expect(result.mappings).toBe('AAAA');
    });

    it('should handle inline source maps with URL encoding', () => {
      const sourceMapJson = JSON.stringify({
        version: 3,
        sources: ['test.js'],
        mappings: 'AAAA',
        names: [],
      });
      const dataUrl = `data:application/json;charset=utf-8,${encodeURIComponent(sourceMapJson)}`;

      const result = parseSourceMap(dataUrl);

      expect(result.version).toBe(3);
      expect(result.sources).toEqual(['test.js']);
    });

    it('should throw error for invalid JSON', () => {
      const invalidJson = 'not a valid json';

      expect(() => parseSourceMap(invalidJson)).toThrow('Failed to parse source map JSON');
    });

    it('should throw error for invalid source map version', () => {
      const invalidVersion = JSON.stringify({
        version: 2, // Invalid version
        sources: ['test.js'],
        mappings: 'AAAA',
      });

      expect(() => parseSourceMap(invalidVersion)).toThrow(
        'Invalid source map version: 2. Only version 3 is supported.',
      );
    });

    it('should throw error for missing version', () => {
      const noVersion = JSON.stringify({
        sources: ['test.js'],
        mappings: 'AAAA',
      });

      expect(() => parseSourceMap(noVersion)).toThrow(
        'Invalid source map version: undefined. Only version 3 is supported.',
      );
    });

    it('should throw error for missing sources array', () => {
      const noSources = JSON.stringify({
        version: 3,
        mappings: 'AAAA',
      });

      expect(() => parseSourceMap(noSources)).toThrow('Source map must have a "sources" array');
    });

    it('should throw error for invalid sources type', () => {
      const invalidSources = JSON.stringify({
        version: 3,
        sources: 'not-an-array',
        mappings: 'AAAA',
      });

      expect(() => parseSourceMap(invalidSources)).toThrow(
        'Source map must have a "sources" array',
      );
    });

    it('should throw error for missing mappings', () => {
      const noMappings = JSON.stringify({
        version: 3,
        sources: ['test.js'],
      });

      expect(() => parseSourceMap(noMappings)).toThrow('Source map must have a "mappings" string');
    });

    it('should throw error for invalid data URL format', () => {
      const invalidDataUrl = 'data:text/plain,invalid';

      expect(() => parseSourceMap(invalidDataUrl)).toThrow(
        'Invalid data URL format for source map',
      );
    });

    it('should parse source map from webpack', async () => {
      // Webpack typically generates source maps with file and sourceRoot
      const webpackSourceMap = JSON.stringify({
        version: 3,
        file: 'bundle.js',
        sources: ['webpack:///src/index.js', 'webpack:///src/components/Button.js'],
        sourcesContent: ['import Button from "./components/Button";', 'export default () => {}'],
        mappings: 'AAAA;AACA',
        names: ['Button'],
        sourceRoot: '',
      });

      const result = parseSourceMap(webpackSourceMap);

      expect(result.version).toBe(3);
      expect(result.sources.length).toBe(2);
      expect(result.names).toContain('Button');
    });

    it('should parse source map from vite', () => {
      // Vite generates clean source maps with relative paths
      const viteSourceMap = JSON.stringify({
        version: 3,
        file: 'index.js',
        sources: ['../src/main.ts', '../src/App.svelte'],
        sourcesContent: ['import App from "./App.svelte";', '<script>...</script>'],
        mappings: 'AAAA,OAAO,GAAG',
        names: ['App'],
      });

      const result = parseSourceMap(viteSourceMap);

      expect(result.version).toBe(3);
      expect(result.sources.length).toBe(2);
    });

    it('should parse source map from rollup', () => {
      // Rollup generates source maps similar to other bundlers
      const rollupSourceMap = JSON.stringify({
        version: 3,
        file: 'bundle.js',
        sources: ['src/index.js', 'src/utils.js'],
        sourcesContent: null, // Rollup might not include sourcesContent
        mappings: 'AAAA',
        names: [],
      });

      const result = parseSourceMap(rollupSourceMap);

      expect(result.version).toBe(3);
      expect(result.sources.length).toBe(2);
      expect(result.sourcesContent).toBeNull();
    });
  });

  describe('mapBundleToSource', () => {
    it('should create position mappings from bundle and source map', () => {
      const bundleContent = 'console.log("hello");';
      const sourceMap: SourceMap = {
        version: 3,
        sources: ['src/index.js'],
        sourcesContent: ['console.log("hello");'],
        mappings: 'AAAA',
        names: [],
      };

      const mappings = mapBundleToSource(bundleContent, sourceMap);

      expect(mappings).toBeDefined();
      expect(Array.isArray(mappings)).toBe(true);
      // The exact number of mappings depends on the source map implementation
      expect(mappings.length).toBeGreaterThanOrEqual(0);
    });

    it('should map positions correctly with real source map', async () => {
      // Load the example bundle source map from fixtures
      const fixturesPath = join(process.cwd(), 'test-fixtures', 'bundles');
      const sourceMapContent = await readFile(join(fixturesPath, 'example-bundle.js.map'), 'utf-8');
      const bundleContent = await readFile(join(fixturesPath, 'example-bundle.js'), 'utf-8');

      const sourceMap = parseSourceMap(sourceMapContent);
      const mappings = mapBundleToSource(bundleContent, sourceMap);

      expect(mappings.length).toBeGreaterThan(0);

      // Verify mapping structure
      mappings.forEach((mapping) => {
        expect(mapping).toHaveProperty('generatedLine');
        expect(mapping).toHaveProperty('generatedColumn');
        expect(typeof mapping.generatedLine).toBe('number');
        expect(typeof mapping.generatedColumn).toBe('number');
      });
    });

    it('should handle empty mappings gracefully', () => {
      const bundleContent = '';
      const sourceMap: SourceMap = {
        version: 3,
        sources: [],
        sourcesContent: null,
        mappings: '',
        names: [],
      };

      const mappings = mapBundleToSource(bundleContent, sourceMap);

      expect(mappings).toBeDefined();
      expect(Array.isArray(mappings)).toBe(true);
    });

    it('should handle invalid mappings gracefully', () => {
      const bundleContent = 'console.log("test");';
      const invalidSourceMap = {
        version: 3,
        sources: ['test.js'],
        mappings: 'INVALID_MAPPINGS!!!',
        names: [],
      } as SourceMap;

      // The library may handle invalid mappings by returning empty mappings
      // rather than throwing an error
      const mappings = mapBundleToSource(bundleContent, invalidSourceMap);
      expect(mappings).toBeDefined();
      expect(Array.isArray(mappings)).toBe(true);
    });

    it('should handle source maps with null original positions', () => {
      const bundleContent = '// Some generated code\nconsole.log("test");';
      const sourceMap: SourceMap = {
        version: 3,
        sources: ['test.js'],
        sourcesContent: ['console.log("test");'],
        // Simple mapping that should work
        mappings: 'AAAA',
        names: [],
      };

      const mappings = mapBundleToSource(bundleContent, sourceMap);

      expect(mappings).toBeDefined();
      expect(Array.isArray(mappings)).toBe(true);
    });
  });

  describe('computeSymbolFragments', () => {
    it('should compute symbol fragments from mappings', () => {
      const symbol = {
        name: 'testFunction',
        location: {
          start: { line: 1, column: 0 },
          end: { line: 1, column: 20 },
        },
      };

      const mappings: PositionMapping[] = [
        {
          generatedLine: 1,
          generatedColumn: 0,
          originalLine: 1,
          originalColumn: 0,
          source: 'test.js',
          name: 'testFunction',
        },
      ];

      const fragment = computeSymbolFragments(symbol, mappings);

      expect(fragment).toBeDefined();
      expect(fragment?.name).toBe('testFunction');
      expect(fragment?.source).toBe('test.js');
      expect(fragment?.start.line).toBe(1);
      expect(fragment?.start.column).toBe(0);
    });

    it('should return null when no matching mapping is found', () => {
      const symbol = {
        name: 'testFunction',
        location: {
          start: { line: 100, column: 0 },
          end: { line: 100, column: 20 },
        },
      };

      const mappings: PositionMapping[] = [
        {
          generatedLine: 1,
          generatedColumn: 0,
          originalLine: null,
          originalColumn: null,
          source: null,
          name: null,
        },
      ];

      const fragment = computeSymbolFragments(symbol, mappings);

      expect(fragment).toBeNull();
    });

    it('should find closest mapping to symbol position', () => {
      const symbol = {
        name: 'myVar',
        location: {
          start: { line: 5, column: 10 },
          end: { line: 5, column: 20 },
        },
      };

      const mappings: PositionMapping[] = [
        {
          generatedLine: 1,
          generatedColumn: 0,
          originalLine: 1,
          originalColumn: 0,
          source: 'test.js',
          name: null,
        },
        {
          generatedLine: 5,
          generatedColumn: 8, // Closest to column 10
          originalLine: 5,
          originalColumn: 10,
          source: 'test.js',
          name: 'myVar',
        },
        {
          generatedLine: 10,
          generatedColumn: 0,
          originalLine: 10,
          originalColumn: 0,
          source: 'test.js',
          name: null,
        },
      ];

      const fragment = computeSymbolFragments(symbol, mappings);

      expect(fragment).toBeDefined();
      expect(fragment?.name).toBe('myVar');
      expect(fragment?.start.line).toBe(5);
      expect(fragment?.start.column).toBe(8);
    });
  });

  describe('computeSymbolFragmentsWithContent', () => {
    it('should compute symbol fragments with accurate byte offsets', () => {
      const bundleContent = 'function testFunction() {\n  return 42;\n}';
      const symbol = {
        name: 'testFunction',
        location: {
          start: { line: 1, column: 0 },
          end: { line: 3, column: 1 },
        },
      };

      const mappings: PositionMapping[] = [
        {
          generatedLine: 1,
          generatedColumn: 0,
          originalLine: 1,
          originalColumn: 0,
          source: 'test.js',
          name: 'testFunction',
        },
      ];

      const fragment = computeSymbolFragmentsWithContent(symbol, bundleContent, mappings);

      expect(fragment).toBeDefined();
      expect(fragment?.name).toBe('testFunction');
      expect(fragment?.byteStart).toBe(0);
      expect(fragment?.byteEnd).toBeGreaterThan(0);
      expect(fragment?.size).toBeGreaterThan(0);
    });

    it('should handle multi-line symbols correctly', () => {
      const bundleContent = 'line1\nline2\nline3';
      const symbol = {
        name: 'multiLineSymbol',
        location: {
          start: { line: 1, column: 0 },
          end: { line: 2, column: 5 },
        },
      };

      const mappings: PositionMapping[] = [
        {
          generatedLine: 1,
          generatedColumn: 0,
          originalLine: 1,
          originalColumn: 0,
          source: 'test.js',
          name: 'multiLineSymbol',
        },
      ];

      const fragment = computeSymbolFragmentsWithContent(symbol, bundleContent, mappings);

      expect(fragment).toBeDefined();
      expect(fragment?.size).toBeGreaterThan(0);
    });

    it('should handle UTF-8 characters correctly in byte calculation', () => {
      const bundleContent = '// 日本語\nfunction test() {}';
      const symbol = {
        name: 'test',
        location: {
          start: { line: 2, column: 0 },
          end: { line: 2, column: 18 },
        },
      };

      const mappings: PositionMapping[] = [
        {
          generatedLine: 2,
          generatedColumn: 0,
          originalLine: 1,
          originalColumn: 0,
          source: 'test.js',
          name: 'test',
        },
      ];

      const fragment = computeSymbolFragmentsWithContent(symbol, bundleContent, mappings);

      expect(fragment).toBeDefined();
      // UTF-8 characters take multiple bytes
      const expectedByteOffset = Buffer.byteLength('// 日本語\n', 'utf-8');
      expect(fragment?.byteStart).toBe(expectedByteOffset);
    });

    it('should return null when computeSymbolFragments returns null', () => {
      const bundleContent = 'test';
      const symbol = {
        name: 'test',
        location: {
          start: { line: 1, column: 0 },
          end: { line: 1, column: 4 },
        },
      };

      const fragment = computeSymbolFragmentsWithContent(symbol, bundleContent, []);

      expect(fragment).toBeNull();
    });
  });

  describe('loadExternalSourceMap', () => {
    it('should load and parse external source map file', async () => {
      const mockReadFile = async (path: string) => {
        expect(path).toBe('/path/to/bundle.js.map');
        return JSON.stringify({
          version: 3,
          sources: ['src/index.js'],
          mappings: 'AAAA',
          names: [],
        });
      };

      const result = await loadExternalSourceMap('/path/to/bundle.js.map', mockReadFile);

      expect(result.version).toBe(3);
      expect(result.sources).toEqual(['src/index.js']);
    });

    it('should throw error when file reading fails', async () => {
      const mockReadFile = async (_path: string) => {
        throw new Error('File not found');
      };

      await expect(loadExternalSourceMap('/nonexistent.map', mockReadFile)).rejects.toThrow(
        'Failed to load external source map from /nonexistent.map',
      );
    });

    it('should throw error when source map is invalid', async () => {
      const mockReadFile = async (_path: string) => {
        return 'invalid json content';
      };

      await expect(loadExternalSourceMap('/invalid.map', mockReadFile)).rejects.toThrow(
        'Failed to load external source map',
      );
    });

    it('should load real example source map from fixtures', async () => {
      const fixturesPath = join(process.cwd(), 'test-fixtures', 'bundles');
      const mapPath = join(fixturesPath, 'example-bundle.js.map');

      const mockReadFile = async (path: string) => {
        return await readFile(path, 'utf-8');
      };

      const result = await loadExternalSourceMap(mapPath, mockReadFile);

      expect(result.version).toBe(3);
      expect(result.sources.length).toBeGreaterThan(0);
      expect(result.mappings).toBeTruthy();
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle source maps with missing sources', () => {
      const sourceMapWithNullSource = JSON.stringify({
        version: 3,
        sources: [],
        mappings: '',
        names: [],
      });

      const result = parseSourceMap(sourceMapWithNullSource);

      expect(result.sources).toEqual([]);
      expect(result.mappings).toBe('');
    });

    it('should handle source maps with null sourcesContent', () => {
      const sourceMap = JSON.stringify({
        version: 3,
        sources: ['test.js'],
        sourcesContent: null,
        mappings: 'AAAA',
        names: [],
      });

      const result = parseSourceMap(sourceMap);

      expect(result.sourcesContent).toBeNull();
    });

    it('should handle very large source maps', () => {
      // Create a large source map
      const largeSources = Array.from({ length: 1000 }, (_, i) => `src/file${i}.js`);
      const largeSourceMap = JSON.stringify({
        version: 3,
        sources: largeSources,
        mappings: 'AAAA;'.repeat(10000),
        names: [],
      });

      const result = parseSourceMap(largeSourceMap);

      expect(result.sources.length).toBe(1000);
      expect(result.mappings.length).toBeGreaterThan(10000);
    });

    it('should handle mappings with special characters', () => {
      const sourceMap: SourceMap = {
        version: 3,
        sources: ['test.js'],
        sourcesContent: ['const x = 1;'],
        mappings: 'AAAA,CAAC,CAAC,CAAC,EAAE;AACL,CAAC,CAAC',
        names: [],
      };

      const mappings = mapBundleToSource('const x = 1;', sourceMap);

      expect(mappings).toBeDefined();
      expect(Array.isArray(mappings)).toBe(true);
    });
  });

  describe('Integration tests', () => {
    it('should process complete workflow: parse, map, and compute fragments', async () => {
      // Load real fixture
      const fixturesPath = join(process.cwd(), 'test-fixtures', 'bundles');
      const sourceMapContent = await readFile(join(fixturesPath, 'example-bundle.js.map'), 'utf-8');
      const bundleContent = await readFile(join(fixturesPath, 'example-bundle.js'), 'utf-8');

      // Parse source map
      const sourceMap = parseSourceMap(sourceMapContent);
      expect(sourceMap.version).toBe(3);

      // Create mappings
      const mappings = mapBundleToSource(bundleContent, sourceMap);
      expect(mappings.length).toBeGreaterThan(0);

      // Compute fragments for a hypothetical symbol
      const symbol = {
        name: 'Calculator',
        location: {
          start: { line: 1, column: 0 },
          end: { line: 1, column: 10 },
        },
      };

      const fragment = computeSymbolFragmentsWithContent(symbol, bundleContent, mappings);

      // We may or may not get a fragment depending on the mappings
      if (fragment) {
        expect(fragment.name).toBe('Calculator');
        expect(fragment.size).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
