/**
 * Tests for dependency analyzer rule
 */

import { describe, it, expect } from 'vitest';
import { createDependencyAnalyzer } from './dependency-analyzer.js';
import type { SuggestionContext } from '../types.js';
import type { ModuleWithAnalysis, DependencyRelationship } from '@smappy/cli/ingestion';

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
 * Helper to create a dependency relationship
 */
function createDependency(
  importer: string,
  imported: string,
  type: 'static' | 'dynamic' = 'static',
): DependencyRelationship {
  return {
    importerPath: importer,
    importedPath: imported,
    type,
  };
}

/**
 * Helper to create a minimal context
 */
function createContext(
  modules: ModuleWithAnalysis[],
  dependencies: DependencyRelationship[] = [],
): SuggestionContext {
  return {
    modules,
    dependencies,
    chunks: [],
    bundles: [],
  };
}

describe('Dependency Analyzer', () => {
  describe('createDependencyAnalyzer', () => {
    it('should create a rule with correct metadata', () => {
      expect.assertions(3);

      const rule = createDependencyAnalyzer();

      expect(rule.id).toBe('dependency-analyzer');
      expect(rule.name).toBe('Dependency Analyzer');
      expect(rule.description).toContain('circular');
    });
  });

  describe('circular dependency detection', () => {
    it('should return empty array when no dependencies exist', async () => {
      expect.assertions(1);

      const rule = createDependencyAnalyzer();
      const context = createContext([createModule()]);

      const suggestions = await rule.execute(context);

      expect(suggestions).toEqual([]);
    });

    it('should return empty array when no circular dependencies exist', async () => {
      expect.assertions(1);

      const rule = createDependencyAnalyzer();
      const context = createContext(
        [
          createModule({ filePath: '/a.js' }),
          createModule({ filePath: '/b.js' }),
          createModule({ filePath: '/c.js' }),
        ],
        [createDependency('/a.js', '/b.js'), createDependency('/b.js', '/c.js')],
      );

      const suggestions = await rule.execute(context);

      expect(suggestions.filter((s) => s.type === 'circular-dependency')).toEqual([]);
    });

    it('should detect simple circular dependency (A -> B -> A)', async () => {
      expect.assertions(5);

      const rule = createDependencyAnalyzer();
      const context = createContext(
        [createModule({ filePath: '/a.js' }), createModule({ filePath: '/b.js' })],
        [createDependency('/a.js', '/b.js'), createDependency('/b.js', '/a.js')],
      );

      const suggestions = await rule.execute(context);

      const circular = suggestions.filter((s) => s.type === 'circular-dependency');
      expect(circular).toHaveLength(1);
      expect(circular[0].severity).toBe('warning');
      expect(circular[0].title).toContain('Circular dependency');
      expect(circular[0].description).toContain('/a.js');
      expect(circular[0].links).toHaveLength(2); // a.js and b.js
    });

    it('should detect longer circular dependency (A -> B -> C -> A)', async () => {
      expect.assertions(3);

      const rule = createDependencyAnalyzer();
      const context = createContext(
        [
          createModule({ filePath: '/a.js' }),
          createModule({ filePath: '/b.js' }),
          createModule({ filePath: '/c.js' }),
        ],
        [
          createDependency('/a.js', '/b.js'),
          createDependency('/b.js', '/c.js'),
          createDependency('/c.js', '/a.js'),
        ],
      );

      const suggestions = await rule.execute(context);

      const circular = suggestions.filter((s) => s.type === 'circular-dependency');
      expect(circular).toHaveLength(1);
      expect(circular[0].links).toHaveLength(3); // a, b, c
      expect(circular[0].description).toContain('→');
    });

    it('should not duplicate circular dependencies', async () => {
      expect.assertions(1);

      const rule = createDependencyAnalyzer();
      const context = createContext(
        [createModule({ filePath: '/a.js' }), createModule({ filePath: '/b.js' })],
        [createDependency('/a.js', '/b.js'), createDependency('/b.js', '/a.js')],
      );

      const suggestions = await rule.execute(context);

      const circular = suggestions.filter((s) => s.type === 'circular-dependency');
      expect(circular).toHaveLength(1);
    });

    it('should handle multiple independent circular dependencies', async () => {
      expect.assertions(2);

      const rule = createDependencyAnalyzer();
      const context = createContext(
        [
          createModule({ filePath: '/a.js' }),
          createModule({ filePath: '/b.js' }),
          createModule({ filePath: '/c.js' }),
          createModule({ filePath: '/d.js' }),
        ],
        [
          createDependency('/a.js', '/b.js'),
          createDependency('/b.js', '/a.js'),
          createDependency('/c.js', '/d.js'),
          createDependency('/d.js', '/c.js'),
        ],
      );

      const suggestions = await rule.execute(context);

      const circular = suggestions.filter((s) => s.type === 'circular-dependency');
      expect(circular).toHaveLength(2);
      expect(circular.every((s) => s.links?.length === 2)).toBe(true);
    });
  });

  describe('unused third-party dependency detection', () => {
    it('should return empty array when no third-party modules exist', async () => {
      expect.assertions(1);

      const rule = createDependencyAnalyzer();
      const context = createContext([createModule({ filePath: '/a.js' })]);

      const suggestions = await rule.execute(context);

      expect(suggestions.filter((s) => s.type === 'unused-third-party')).toEqual([]);
    });

    it('should detect unused third-party dependency', async () => {
      expect.assertions(4);

      const rule = createDependencyAnalyzer();
      const context = createContext(
        [
          createModule({ filePath: '/a.js' }),
          createModule({
            filePath: '/node_modules/unused/index.js',
            isThirdParty: true,
            packageName: 'unused',
          }),
        ],
        [],
      );

      const suggestions = await rule.execute(context);

      const unused = suggestions.filter((s) => s.type === 'unused-third-party');
      expect(unused).toHaveLength(1);
      expect(unused[0].severity).toBe('info');
      expect(unused[0].title).toContain('unused');
      expect(unused[0].description).toContain('unused');
    });

    it('should not flag third-party dependency that is imported', async () => {
      expect.assertions(1);

      const rule = createDependencyAnalyzer();
      const context = createContext(
        [
          createModule({ filePath: '/a.js' }),
          createModule({
            filePath: '/node_modules/used/index.js',
            isThirdParty: true,
            packageName: 'used',
          }),
        ],
        [createDependency('/a.js', '/node_modules/used/index.js')],
      );

      const suggestions = await rule.execute(context);

      const unused = suggestions.filter((s) => s.type === 'unused-third-party');
      expect(unused).toEqual([]);
    });

    it('should detect multiple unused third-party dependencies', async () => {
      expect.assertions(2);

      const rule = createDependencyAnalyzer();
      const context = createContext(
        [
          createModule({ filePath: '/a.js' }),
          createModule({
            filePath: '/node_modules/unused1/index.js',
            isThirdParty: true,
            packageName: 'unused1',
          }),
          createModule({
            filePath: '/node_modules/unused2/index.js',
            isThirdParty: true,
            packageName: 'unused2',
          }),
        ],
        [],
      );

      const suggestions = await rule.execute(context);

      const unused = suggestions.filter((s) => s.type === 'unused-third-party');
      expect(unused).toHaveLength(2);
      expect(unused.map((s) => s.title)).toEqual(
        expect.arrayContaining([
          expect.stringContaining('unused1'),
          expect.stringContaining('unused2'),
        ]),
      );
    });

    it('should skip third-party modules without package name', async () => {
      expect.assertions(1);

      const rule = createDependencyAnalyzer();
      const context = createContext(
        [
          createModule({
            filePath: '/node_modules/mystery/index.js',
            isThirdParty: true,
            // no packageName
          }),
        ],
        [],
      );

      const suggestions = await rule.execute(context);

      const unused = suggestions.filter((s) => s.type === 'unused-third-party');
      expect(unused).toEqual([]);
    });
  });

  describe('deep dependency chain detection', () => {
    it('should return empty array when chains are within limit', async () => {
      expect.assertions(1);

      const rule = createDependencyAnalyzer({ maxDepth: 5 });
      const context = createContext(
        [
          createModule({ filePath: '/a.js' }),
          createModule({ filePath: '/b.js' }),
          createModule({ filePath: '/c.js' }),
        ],
        [createDependency('/a.js', '/b.js'), createDependency('/b.js', '/c.js')],
      );

      const suggestions = await rule.execute(context);

      const deep = suggestions.filter((s) => s.type === 'deep-dependency-chain');
      expect(deep).toEqual([]);
    });

    it('should detect deep dependency chain exceeding max depth', async () => {
      expect.assertions(4);

      const rule = createDependencyAnalyzer({ maxDepth: 3 });
      const modules = [
        createModule({ filePath: '/a.js' }),
        createModule({ filePath: '/b.js' }),
        createModule({ filePath: '/c.js' }),
        createModule({ filePath: '/d.js' }),
        createModule({ filePath: '/e.js' }),
      ];
      const dependencies = [
        createDependency('/a.js', '/b.js'),
        createDependency('/b.js', '/c.js'),
        createDependency('/c.js', '/d.js'),
        createDependency('/d.js', '/e.js'),
      ];
      const context = createContext(modules, dependencies);

      const suggestions = await rule.execute(context);

      const deep = suggestions.filter((s) => s.type === 'deep-dependency-chain');
      expect(deep.length).toBeGreaterThan(0);
      expect(deep[0].severity).toBe('info'); // depth 4, not > 10
      expect(deep[0].title).toContain('Deep dependency chain');
      expect(deep[0].description).toContain('depth');
    });

    it('should use warning severity for very deep chains (>10)', async () => {
      expect.assertions(2);

      const rule = createDependencyAnalyzer({ maxDepth: 5 });
      const modules = Array.from({ length: 15 }, (_, i) =>
        createModule({ filePath: `/${String.fromCharCode(97 + i)}.js` }),
      );
      const dependencies = Array.from({ length: 14 }, (_, i) =>
        createDependency(
          `/${String.fromCharCode(97 + i)}.js`,
          `/${String.fromCharCode(98 + i)}.js`,
        ),
      );
      const context = createContext(modules, dependencies);

      const suggestions = await rule.execute(context);

      const deep = suggestions.filter((s) => s.type === 'deep-dependency-chain');
      const veryDeep = deep.filter((s) => s.severity === 'warning');
      expect(veryDeep.length).toBeGreaterThan(0);
      expect(veryDeep[0].title).toContain('Deep dependency chain');
    });

    it('should include all modules in the chain as links', async () => {
      expect.assertions(2);

      const rule = createDependencyAnalyzer({ maxDepth: 3 });
      const modules = [
        createModule({ filePath: '/a.js' }),
        createModule({ filePath: '/b.js' }),
        createModule({ filePath: '/c.js' }),
        createModule({ filePath: '/d.js' }),
        createModule({ filePath: '/e.js' }),
      ];
      const dependencies = [
        createDependency('/a.js', '/b.js'),
        createDependency('/b.js', '/c.js'),
        createDependency('/c.js', '/d.js'),
        createDependency('/d.js', '/e.js'),
      ];
      const context = createContext(modules, dependencies);

      const suggestions = await rule.execute(context);

      const deep = suggestions.filter((s) => s.type === 'deep-dependency-chain');
      expect(deep.length).toBeGreaterThan(0);
      expect(deep[0].links?.length).toBeGreaterThan(3); // Should include multiple modules
    });
  });

  describe('configuration options', () => {
    it('should respect detectCircular option', async () => {
      expect.assertions(2);

      const ruleWithCircular = createDependencyAnalyzer({ detectCircular: true });
      const ruleWithoutCircular = createDependencyAnalyzer({ detectCircular: false });

      const context = createContext(
        [createModule({ filePath: '/a.js' }), createModule({ filePath: '/b.js' })],
        [createDependency('/a.js', '/b.js'), createDependency('/b.js', '/a.js')],
      );

      const withSuggestions = await ruleWithCircular.execute(context);
      const withoutSuggestions = await ruleWithoutCircular.execute(context);

      expect(withSuggestions.filter((s) => s.type === 'circular-dependency')).toHaveLength(1);
      expect(withoutSuggestions.filter((s) => s.type === 'circular-dependency')).toHaveLength(0);
    });

    it('should respect detectUnusedThirdParty option', async () => {
      expect.assertions(2);

      const ruleWithUnused = createDependencyAnalyzer({ detectUnusedThirdParty: true });
      const ruleWithoutUnused = createDependencyAnalyzer({ detectUnusedThirdParty: false });

      const context = createContext([
        createModule({
          filePath: '/node_modules/unused/index.js',
          isThirdParty: true,
          packageName: 'unused',
        }),
      ]);

      const withSuggestions = await ruleWithUnused.execute(context);
      const withoutSuggestions = await ruleWithoutUnused.execute(context);

      expect(withSuggestions.filter((s) => s.type === 'unused-third-party')).toHaveLength(1);
      expect(withoutSuggestions.filter((s) => s.type === 'unused-third-party')).toHaveLength(0);
    });

    it('should respect detectDeepChains option', async () => {
      expect.assertions(2);

      const ruleWithDeep = createDependencyAnalyzer({ detectDeepChains: true, maxDepth: 3 });
      const ruleWithoutDeep = createDependencyAnalyzer({ detectDeepChains: false });

      const modules = [
        createModule({ filePath: '/a.js' }),
        createModule({ filePath: '/b.js' }),
        createModule({ filePath: '/c.js' }),
        createModule({ filePath: '/d.js' }),
        createModule({ filePath: '/e.js' }),
      ];
      const dependencies = [
        createDependency('/a.js', '/b.js'),
        createDependency('/b.js', '/c.js'),
        createDependency('/c.js', '/d.js'),
        createDependency('/d.js', '/e.js'),
      ];
      const context = createContext(modules, dependencies);

      const withSuggestions = await ruleWithDeep.execute(context);
      const withoutSuggestions = await ruleWithoutDeep.execute(context);

      expect(
        withSuggestions.filter((s) => s.type === 'deep-dependency-chain').length,
      ).toBeGreaterThan(0);
      expect(withoutSuggestions.filter((s) => s.type === 'deep-dependency-chain')).toHaveLength(0);
    });

    it('should respect custom maxDepth', async () => {
      expect.assertions(2);

      const ruleDepth3 = createDependencyAnalyzer({ maxDepth: 3 });
      const ruleDepth10 = createDependencyAnalyzer({ maxDepth: 10 });

      const modules = [
        createModule({ filePath: '/a.js' }),
        createModule({ filePath: '/b.js' }),
        createModule({ filePath: '/c.js' }),
        createModule({ filePath: '/d.js' }),
        createModule({ filePath: '/e.js' }),
      ];
      const dependencies = [
        createDependency('/a.js', '/b.js'),
        createDependency('/b.js', '/c.js'),
        createDependency('/c.js', '/d.js'),
        createDependency('/d.js', '/e.js'),
      ];
      const context = createContext(modules, dependencies);

      const suggestions3 = await ruleDepth3.execute(context);
      const suggestions10 = await ruleDepth10.execute(context);

      expect(suggestions3.filter((s) => s.type === 'deep-dependency-chain').length).toBeGreaterThan(
        0,
      );
      expect(suggestions10.filter((s) => s.type === 'deep-dependency-chain')).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty context', async () => {
      expect.assertions(1);

      const rule = createDependencyAnalyzer();
      const context = createContext([]);

      const suggestions = await rule.execute(context);

      expect(suggestions).toEqual([]);
    });

    it('should handle modules with no dependencies', async () => {
      expect.assertions(1);

      const rule = createDependencyAnalyzer();
      const context = createContext([
        createModule({ filePath: '/a.js' }),
        createModule({ filePath: '/b.js' }),
      ]);

      const suggestions = await rule.execute(context);

      expect(suggestions.filter((s) => s.type === 'circular-dependency')).toEqual([]);
    });

    it('should handle self-referencing modules', async () => {
      expect.assertions(1);

      const rule = createDependencyAnalyzer();
      const context = createContext(
        [createModule({ filePath: '/a.js' })],
        [createDependency('/a.js', '/a.js')],
      );

      const suggestions = await rule.execute(context);

      const circular = suggestions.filter((s) => s.type === 'circular-dependency');
      expect(circular.length).toBeGreaterThan(0);
    });
  });
});
