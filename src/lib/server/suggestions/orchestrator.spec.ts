/**
 * Tests for suggestion analyzer orchestrator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SuggestionAnalyzer, createSuggestionAnalyzer } from './orchestrator.js';
import { createRuleRegistry } from './registry.js';
import type { SuggestionRule, SuggestionContext } from './types.js';
import type { ModuleWithAnalysis } from '../ingestion/db/writer.js';

describe('SuggestionAnalyzer', () => {
  let analyzer: SuggestionAnalyzer;
  let context: SuggestionContext;

  beforeEach(() => {
    analyzer = createSuggestionAnalyzer();
    context = {
      modules: [],
      dependencies: [],
      chunks: [],
      bundles: [],
    };
  });

  describe('analyze', () => {
    it('should return empty array when no rules are registered', () => {
      const suggestions = analyzer.analyze(context);
      expect(suggestions).toEqual([]);
    });

    it('should execute single rule and return suggestions', () => {
      const mockRule: SuggestionRule = {
        id: 'test-rule',
        name: 'Test Rule',
        description: 'A test rule',
        execute: () => [
          {
            type: 'TEST',
            severity: 'info',
            title: 'Test suggestion',
            description: 'This is a test',
          },
        ],
      };

      analyzer.registerRule(mockRule);
      const suggestions = analyzer.analyze(context);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].type).toBe('TEST');
      expect(suggestions[0].title).toBe('Test suggestion');
    });

    it('should execute multiple rules and aggregate suggestions', () => {
      const rule1: SuggestionRule = {
        id: 'rule-1',
        name: 'Rule 1',
        description: 'First rule',
        execute: () => [
          {
            type: 'TYPE_1',
            severity: 'warning',
            title: 'Warning from rule 1',
            description: 'First warning',
          },
        ],
      };

      const rule2: SuggestionRule = {
        id: 'rule-2',
        name: 'Rule 2',
        description: 'Second rule',
        execute: () => [
          {
            type: 'TYPE_2',
            severity: 'info',
            title: 'Info from rule 2',
            description: 'Second info',
          },
        ],
      };

      analyzer.registerRule(rule1);
      analyzer.registerRule(rule2);

      const suggestions = analyzer.analyze(context);

      expect(suggestions).toHaveLength(2);
      expect(suggestions.map((s) => s.type)).toEqual(['TYPE_1', 'TYPE_2']);
    });

    it('should handle rule that returns multiple suggestions', () => {
      const rule: SuggestionRule = {
        id: 'multi-rule',
        name: 'Multi Rule',
        description: 'Returns multiple suggestions',
        execute: () => [
          {
            type: 'MULTI_1',
            severity: 'info',
            title: 'First',
            description: 'First suggestion',
          },
          {
            type: 'MULTI_2',
            severity: 'warning',
            title: 'Second',
            description: 'Second suggestion',
          },
        ],
      };

      analyzer.registerRule(rule);
      const suggestions = analyzer.analyze(context);

      expect(suggestions).toHaveLength(2);
    });

    it('should handle rule that returns empty array', () => {
      const rule: SuggestionRule = {
        id: 'empty-rule',
        name: 'Empty Rule',
        description: 'Returns no suggestions',
        execute: () => [],
      };

      analyzer.registerRule(rule);
      const suggestions = analyzer.analyze(context);

      expect(suggestions).toEqual([]);
    });

    it('should continue execution if one rule throws error', () => {
      const goodRule: SuggestionRule = {
        id: 'good-rule',
        name: 'Good Rule',
        description: 'Works correctly',
        execute: () => [
          {
            type: 'GOOD',
            severity: 'info',
            title: 'Good suggestion',
            description: 'This works',
          },
        ],
      };

      const badRule: SuggestionRule = {
        id: 'bad-rule',
        name: 'Bad Rule',
        description: 'Throws error',
        execute: () => {
          throw new Error('Rule execution failed');
        },
      };

      analyzer.registerRule(goodRule);
      analyzer.registerRule(badRule);

      // Should not throw, should continue with other rules
      const suggestions = analyzer.analyze(context);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].type).toBe('GOOD');
    });

    it('should pass correct context to rules', () => {
      const module: ModuleWithAnalysis = {
        filePath: './src/test.js',
        sourceContent: 'export function test() {}',
        fileType: 'js',
        originalSize: 100,
        bundledSize: 90,
        isThirdParty: false,
        symbols: [],
        symbolFragments: new Map(),
      };

      const testContext: SuggestionContext = {
        modules: [module],
        dependencies: [],
        chunks: [],
        bundles: [],
      };

      let receivedContext: SuggestionContext | undefined;

      const rule: SuggestionRule = {
        id: 'context-test',
        name: 'Context Test',
        description: 'Tests context passing',
        execute: (ctx) => {
          receivedContext = ctx;
          return [];
        },
      };

      analyzer.registerRule(rule);
      analyzer.analyze(testContext);

      expect(receivedContext).toBeDefined();
      expect(receivedContext?.modules).toHaveLength(1);
      expect(receivedContext?.modules[0].filePath).toBe('./src/test.js');
    });
  });

  describe('registerRule', () => {
    it('should register a rule', () => {
      const rule: SuggestionRule = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        execute: () => [],
      };

      analyzer.registerRule(rule);

      // Rule should be registered (even if it returns empty)
      expect(analyzer.getRegistry().getRule('test')).toBe(rule);
    });
  });

  describe('unregisterRule', () => {
    it('should unregister a rule', () => {
      const rule: SuggestionRule = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        execute: () => [
          {
            type: 'TEST',
            severity: 'info',
            title: 'Test',
            description: 'Test',
          },
        ],
      };

      analyzer.registerRule(rule);
      expect(analyzer.analyze(context)).toHaveLength(1);

      analyzer.unregisterRule('test');
      expect(analyzer.analyze(context)).toHaveLength(0);
    });
  });

  describe('getRegistry', () => {
    it('should return the rule registry', () => {
      const registry = analyzer.getRegistry();
      expect(registry).toBeDefined();
      expect(registry.getAllRules).toBeDefined();
    });

    it('should allow custom registry', () => {
      const customRegistry = createRuleRegistry();
      const customAnalyzer = new SuggestionAnalyzer(customRegistry);

      expect(customAnalyzer.getRegistry()).toBe(customRegistry);
    });
  });
});
