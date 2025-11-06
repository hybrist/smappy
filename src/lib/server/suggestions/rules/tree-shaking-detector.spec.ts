/**
 * Tests for tree-shaking detector rule
 */

import { describe, it, expect } from 'vitest';
import { createTreeShakingDetector } from './tree-shaking-detector.js';
import type { SuggestionContext } from '../types.js';
import type { ModuleWithAnalysis } from '../../ingestion/db/writer.js';

/**
 * Helper to create a minimal module with analysis
 */
function createModule(overrides: Partial<ModuleWithAnalysis> = {}): ModuleWithAnalysis {
  return {
    filePath: '/test/module.js',
    sourceContent: 'export const foo = 1;',
    fileType: 'js',
    originalSize: 1000,
    bundledSize: 800,
    isThirdParty: false,
    symbols: [],
    symbolFragments: new Map(),
    exports: [],
    usedExports: [],
    ...overrides,
  };
}

/**
 * Helper to create a minimal context
 */
function createContext(modules: ModuleWithAnalysis[]): SuggestionContext {
  return {
    modules,
    dependencies: [],
    chunks: [],
    bundles: [],
  };
}

describe('Tree-shaking Detector', () => {
  describe('createTreeShakingDetector', () => {
    it('should create a rule with correct metadata', () => {
      expect.assertions(3);

      const rule = createTreeShakingDetector();

      expect(rule.id).toBe('tree-shaking-detector');
      expect(rule.name).toBe('Tree-shaking Detector');
      expect(rule.description).toContain('unused exports');
    });
  });

  describe('execute', () => {
    it('should return empty array when no modules have exports', () => {
      expect.assertions(1);

      const rule = createTreeShakingDetector();
      const context = createContext([
        createModule({ exports: [] }),
        createModule({ exports: undefined }),
      ]);

      const suggestions = rule.execute(context);

      expect(suggestions).toEqual([]);
    });

    it('should return empty array when all exports are used', () => {
      expect.assertions(1);

      const rule = createTreeShakingDetector();
      const context = createContext([
        createModule({
          exports: ['foo', 'bar', 'baz'],
          usedExports: ['foo', 'bar', 'baz'],
          bundledSize: 1000,
        }),
      ]);

      const suggestions = rule.execute(context);

      expect(suggestions).toEqual([]);
    });

    it('should detect completely unused module', () => {
      expect.assertions(7);

      const rule = createTreeShakingDetector();
      const context = createContext([
        createModule({
          filePath: '/src/unused-module.js',
          exports: ['foo', 'bar'],
          usedExports: [],
          bundledSize: 2000,
        }),
      ]);

      const suggestions = rule.execute(context);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].type).toBe('tree-shaking');
      expect(suggestions[0].severity).toBe('warning');
      expect(suggestions[0].title).toBe('Module has no used exports');
      expect(suggestions[0].description).toContain('/src/unused-module.js');
      expect(suggestions[0].description).toContain('exports 2 symbol(s)');
      expect(suggestions[0].links).toHaveLength(1);
    });

    it('should detect partially unused exports', () => {
      expect.assertions(7);

      const rule = createTreeShakingDetector();
      const context = createContext([
        createModule({
          filePath: '/src/partial-module.js',
          exports: ['foo', 'bar', 'baz'],
          usedExports: ['foo'], // Only foo is used
          bundledSize: 3000,
        }),
      ]);

      const suggestions = rule.execute(context);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].type).toBe('tree-shaking');
      expect(suggestions[0].title).toBe('Module has unused exports');
      expect(suggestions[0].description).toContain('/src/partial-module.js');
      expect(suggestions[0].description).toContain("'bar', 'baz'");
      expect(suggestions[0].description).toContain('only 1 are used');
      expect(suggestions[0].links?.length).toBeGreaterThan(1); // Module + symbols
    });

    it('should skip modules below size threshold', () => {
      expect.assertions(1);

      const rule = createTreeShakingDetector({ minSizeThreshold: 1000 });
      const context = createContext([
        createModule({
          exports: ['foo', 'bar'],
          usedExports: [],
          bundledSize: 500, // Below threshold
        }),
      ]);

      const suggestions = rule.execute(context);

      expect(suggestions).toEqual([]);
    });

    it('should calculate potential savings correctly for completely unused module', () => {
      expect.assertions(2);

      const rule = createTreeShakingDetector();
      const context = createContext([
        createModule({
          exports: ['foo'],
          usedExports: [],
          bundledSize: 2048,
        }),
      ]);

      const suggestions = rule.execute(context);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].description).toContain('2.00 KB');
    });

    it('should calculate potential savings correctly for partially unused module', () => {
      expect.assertions(2);

      const rule = createTreeShakingDetector();
      const context = createContext([
        createModule({
          exports: ['foo', 'bar', 'baz', 'qux'], // 4 exports
          usedExports: ['foo', 'bar'], // 2 used
          bundledSize: 4000, // So 2 unused = 2000 bytes
        }),
      ]);

      const suggestions = rule.execute(context);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].description).toContain('1.95 KB'); // ~2000 bytes
    });

    it('should use warning severity for completely unused modules', () => {
      expect.assertions(2);

      const rule = createTreeShakingDetector();
      const context = createContext([
        createModule({
          exports: ['foo'],
          usedExports: [],
          bundledSize: 500,
        }),
      ]);

      const suggestions = rule.execute(context);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].severity).toBe('warning');
    });

    it('should use warning severity for large partially unused modules', () => {
      expect.assertions(2);

      const rule = createTreeShakingDetector();
      const context = createContext([
        createModule({
          exports: ['foo', 'bar'],
          usedExports: ['foo'],
          bundledSize: 3000, // Savings > 1000 bytes
        }),
      ]);

      const suggestions = rule.execute(context);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].severity).toBe('warning');
    });

    it('should use info severity for small partially unused modules', () => {
      expect.assertions(2);

      const rule = createTreeShakingDetector();
      const context = createContext([
        createModule({
          exports: ['foo', 'bar'],
          usedExports: ['foo'],
          bundledSize: 500, // Savings < 1000 bytes
        }),
      ]);

      const suggestions = rule.execute(context);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].severity).toBe('info');
    });

    it('should handle modules with many unused exports', () => {
      expect.assertions(3);

      const rule = createTreeShakingDetector();
      const exports = Array.from({ length: 20 }, (_, i) => `export${i}`);
      const context = createContext([
        createModule({
          exports,
          usedExports: [],
          bundledSize: 5000,
        }),
      ]);

      const suggestions = rule.execute(context);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].description).toContain('exports 20 symbol(s)');
      expect(suggestions[0].links).toHaveLength(1); // Only module link (no symbol links for >10)
    });

    it('should limit export names in description to 3', () => {
      expect.assertions(2);

      const rule = createTreeShakingDetector();
      const context = createContext([
        createModule({
          exports: ['a', 'b', 'c', 'd', 'e'],
          usedExports: ['a'],
          bundledSize: 2000,
        }),
      ]);

      const suggestions = rule.execute(context);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].description).toContain('4 exports');
    });

    it('should include symbol links for partially unused modules with ≤10 unused exports', () => {
      expect.assertions(3);

      const rule = createTreeShakingDetector({ detectPartiallyUnused: true });
      const context = createContext([
        createModule({
          filePath: '/src/module.js',
          exports: ['a', 'b', 'c'],
          usedExports: ['a'],
          bundledSize: 2000,
        }),
      ]);

      const suggestions = rule.execute(context);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].links).toHaveLength(3); // Module + 2 symbols
      expect(suggestions[0].links?.[1].entityType).toBe('Symbol');
    });

    it('should respect detectPartiallyUnused option', () => {
      expect.assertions(2);

      const rule = createTreeShakingDetector({ detectPartiallyUnused: false });
      const context = createContext([
        createModule({
          exports: ['a', 'b', 'c'],
          usedExports: ['a'],
          bundledSize: 2000,
        }),
      ]);

      const suggestions = rule.execute(context);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].links).toHaveLength(1); // Only module link
    });

    it('should process multiple modules', () => {
      expect.assertions(1);

      const rule = createTreeShakingDetector();
      const context = createContext([
        createModule({
          filePath: '/src/module1.js',
          exports: ['a'],
          usedExports: [],
          bundledSize: 1000,
        }),
        createModule({
          filePath: '/src/module2.js',
          exports: ['b'],
          usedExports: [],
          bundledSize: 1000,
        }),
        createModule({
          filePath: '/src/module3.js',
          exports: ['c'],
          usedExports: ['c'], // Fully used
          bundledSize: 1000,
        }),
      ]);

      const suggestions = rule.execute(context);

      expect(suggestions).toHaveLength(2); // module1 and module2
    });

    it('should handle modules with undefined usedExports', () => {
      expect.assertions(2);

      const rule = createTreeShakingDetector();
      const context = createContext([
        createModule({
          exports: ['foo', 'bar'],
          usedExports: undefined,
          bundledSize: 1000,
        }),
      ]);

      const suggestions = rule.execute(context);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].description).toContain('none are used');
    });

    it('should format bytes correctly', () => {
      expect.assertions(3);

      const rule = createTreeShakingDetector();

      // Test small bytes
      const context1 = createContext([
        createModule({
          exports: ['a'],
          usedExports: [],
          bundledSize: 500,
        }),
      ]);
      expect(rule.execute(context1)[0].description).toContain('500 bytes');

      // Test KB
      const context2 = createContext([
        createModule({
          exports: ['a'],
          usedExports: [],
          bundledSize: 2048,
        }),
      ]);
      expect(rule.execute(context2)[0].description).toContain('2.00 KB');

      // Test MB
      const context3 = createContext([
        createModule({
          exports: ['a'],
          usedExports: [],
          bundledSize: 2097152, // 2 MB
        }),
      ]);
      expect(rule.execute(context3)[0].description).toContain('2.00 MB');
    });
  });
});
