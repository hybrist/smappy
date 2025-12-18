/**
 * Tests for large module detector
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  LargeModuleDetector,
  createLargeModuleDetector,
  type LargeModuleDetectorConfig,
} from './large-module-detector.js';
import type { SuggestionContext } from '../../suggestions/types.js';
import type { ModuleWithAnalysis } from '../db/writer.js';
import { createMockBundleInput, createMockChunkInput } from '@smappy/core';

describe('LargeModuleDetector', () => {
  let detector: LargeModuleDetector;
  let context: SuggestionContext;

  // Helper to create test modules
  const createModule = (
    filePath: string,
    bundledSize: number,
    isThirdParty = false,
  ): ModuleWithAnalysis => ({
    filePath,
    sourceContent: '',
    fileType: 'js',
    originalSize: bundledSize,
    bundledSize,
    isThirdParty,
    symbols: [],
    symbolFragments: new Map(),
  });

  beforeEach(() => {
    detector = createLargeModuleDetector();
    context = {
      modules: [],
      dependencies: [],
      chunks: [],
      bundles: [],
    };
  });

  describe('rule metadata', () => {
    it('should have correct rule metadata', () => {
      expect(detector.id).toBe('large-module');
      expect(detector.name).toBe('Large Module Detector');
      expect(detector.description).toContain('large');
    });
  });

  describe('execute', () => {
    it('should return empty array when no modules exist', () => {
      const suggestions = detector.execute(context);
      expect(suggestions).toEqual([]);
    });

    it('should return empty array when all modules are below threshold', () => {
      context.modules = [
        createModule('./src/small.js', 10 * 1024), // 10KB
        createModule('./src/tiny.js', 1 * 1024), // 1KB
      ];

      const suggestions = detector.execute(context);
      expect(suggestions).toEqual([]);
    });

    it('should detect module above warning threshold', () => {
      const moduleSize = 60 * 1024; // 60KB
      context.modules = [createModule('./src/large.js', moduleSize)];

      const suggestions = detector.execute(context);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].type).toBe('LARGE_MODULE');
      expect(suggestions[0].severity).toBe('warning');
      expect(suggestions[0].title).toContain('Large module detected');
      expect(suggestions[0].title).toContain('60.0KB');
      expect(suggestions[0].description).toContain('./src/large.js');
      expect(suggestions[0].description).toContain('optimization strategies');
    });

    it('should detect module above critical threshold', () => {
      const moduleSize = 150 * 1024; // 150KB
      context.modules = [createModule('./src/huge.js', moduleSize)];

      const suggestions = detector.execute(context);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].type).toBe('LARGE_MODULE');
      expect(suggestions[0].severity).toBe('critical');
      expect(suggestions[0].title).toContain(
        'Critical: Very large module detected',
      );
      expect(suggestions[0].title).toContain('150.0KB');
    });

    it('should skip third-party modules', () => {
      context.modules = [
        createModule('./node_modules/lodash/index.js', 200 * 1024, true),
        createModule('./src/app.js', 60 * 1024, false),
      ];

      const suggestions = detector.execute(context);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].links?.[0].entityPath).toBe('./src/app.js');
    });

    it('should detect multiple large modules', () => {
      context.modules = [
        createModule('./src/large1.js', 60 * 1024), // warning
        createModule('./src/large2.js', 80 * 1024), // warning
        createModule('./src/huge.js', 150 * 1024), // critical
        createModule('./src/small.js', 10 * 1024), // ok
      ];

      const suggestions = detector.execute(context);

      expect(suggestions).toHaveLength(3);
      expect(suggestions.filter((s) => s.severity === 'warning')).toHaveLength(
        2,
      );
      expect(suggestions.filter((s) => s.severity === 'critical')).toHaveLength(
        1,
      );
    });

    it('should include module link in suggestions', () => {
      context.modules = [createModule('./src/large.js', 60 * 1024)];

      const suggestions = detector.execute(context);

      expect(suggestions[0].links).toBeDefined();
      expect(suggestions[0].links).toHaveLength(1);
      expect(suggestions[0].links?.[0].entityType).toBe('Module');
      expect(suggestions[0].links?.[0].entityPath).toBe('./src/large.js');
    });

    it('should include code splitting suggestions in description', () => {
      context.modules = [createModule('./src/large.js', 60 * 1024)];

      const suggestions = detector.execute(context);

      expect(suggestions[0].description).toContain('Code splitting');
      expect(suggestions[0].description).toContain('Lazy loading');
      expect(suggestions[0].description).toContain('Tree shaking');
      expect(suggestions[0].description).toContain('Refactoring');
    });

    it('should mention threshold in description', () => {
      context.modules = [createModule('./src/large.js', 60 * 1024)];

      const suggestions = detector.execute(context);

      expect(suggestions[0].description).toContain('50.0KB');
      expect(suggestions[0].description).toContain('warning threshold');
    });

    it('should detect module exactly at warning threshold', () => {
      context.modules = [createModule('./src/large.js', 50 * 1024)]; // exactly 50KB

      const suggestions = detector.execute(context);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].severity).toBe('warning');
    });

    it('should detect module exactly at critical threshold', () => {
      context.modules = [createModule('./src/huge.js', 100 * 1024)]; // exactly 100KB

      const suggestions = detector.execute(context);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].severity).toBe('critical');
    });
  });

  describe('custom configuration', () => {
    it('should accept custom warning threshold', () => {
      const config: LargeModuleDetectorConfig = {
        warningThreshold: 30 * 1024, // 30KB
      };
      detector = createLargeModuleDetector(config);

      context.modules = [createModule('./src/medium.js', 40 * 1024)];

      const suggestions = detector.execute(context);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].severity).toBe('warning');
    });

    it('should accept custom critical threshold', () => {
      const config: LargeModuleDetectorConfig = {
        criticalThreshold: 80 * 1024, // 80KB
      };
      detector = createLargeModuleDetector(config);

      context.modules = [createModule('./src/large.js', 90 * 1024)];

      const suggestions = detector.execute(context);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].severity).toBe('critical');
    });

    it('should accept both custom thresholds', () => {
      const config: LargeModuleDetectorConfig = {
        warningThreshold: 20 * 1024, // 20KB
        criticalThreshold: 40 * 1024, // 40KB
      };
      detector = createLargeModuleDetector(config);

      context.modules = [
        createModule('./src/warning.js', 30 * 1024),
        createModule('./src/critical.js', 50 * 1024),
      ];

      const suggestions = detector.execute(context);

      expect(suggestions).toHaveLength(2);
      expect(suggestions[0].severity).toBe('warning');
      expect(suggestions[1].severity).toBe('critical');
    });

    it('should use default thresholds when no config provided', () => {
      // Default: warning=50KB, critical=100KB
      context.modules = [
        createModule('./src/justUnderWarning.js', 49 * 1024),
        createModule('./src/atWarning.js', 50 * 1024),
        createModule('./src/justUnderCritical.js', 99 * 1024),
        createModule('./src/atCritical.js', 100 * 1024),
      ];

      const suggestions = detector.execute(context);

      expect(suggestions).toHaveLength(3);
      expect(suggestions.filter((s) => s.severity === 'warning')).toHaveLength(
        2,
      );
      expect(suggestions.filter((s) => s.severity === 'critical')).toHaveLength(
        1,
      );
    });
  });

  describe('size formatting', () => {
    it('should format bytes correctly in suggestions', () => {
      context.modules = [createModule('./src/medium.js', 60 * 1024)];

      const suggestions = detector.execute(context);
      expect(suggestions[0].title).toContain('60.0KB');
    });

    it('should format kilobytes correctly', () => {
      context.modules = [createModule('./src/medium.js', 75 * 1024 + 512)];

      const suggestions = detector.execute(context);
      expect(suggestions[0].title).toContain('75.5KB');
    });

    it('should format megabytes correctly', () => {
      context.modules = [
        createModule('./src/huge.js', 2 * 1024 * 1024 + 512 * 1024),
      ];

      const suggestions = detector.execute(context);
      expect(suggestions[0].title).toContain('2.5MB');
    });
  });

  describe('edge cases', () => {
    it('should handle module with zero size', () => {
      context.modules = [createModule('./src/empty.js', 0)];

      const suggestions = detector.execute(context);
      expect(suggestions).toEqual([]);
    });

    it('should handle module just below warning threshold', () => {
      context.modules = [createModule('./src/almostLarge.js', 50 * 1024 - 1)];

      const suggestions = detector.execute(context);
      expect(suggestions).toEqual([]);
    });

    it('should handle very large module (over 1MB)', () => {
      const veryLargeSize = 5 * 1024 * 1024; // 5MB
      context.modules = [createModule('./src/veryHuge.js', veryLargeSize)];

      const suggestions = detector.execute(context);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].severity).toBe('critical');
      expect(suggestions[0].title).toContain('5.0MB');
    });

    it('should handle modules with same size', () => {
      const size = 60 * 1024;
      context.modules = [
        createModule('./src/large1.js', size),
        createModule('./src/large2.js', size),
        createModule('./src/large3.js', size),
      ];

      const suggestions = detector.execute(context);

      expect(suggestions).toHaveLength(3);
      suggestions.forEach((suggestion) => {
        expect(suggestion.severity).toBe('warning');
        expect(suggestion.title).toContain('60.0KB');
      });
    });

    it('should handle empty context with no modules', () => {
      const emptyContext: SuggestionContext = {
        modules: [],
        dependencies: [],
        chunks: [],
        bundles: [],
      };

      const suggestions = detector.execute(emptyContext);
      expect(suggestions).toEqual([]);
    });
  });

  describe('integration with suggestion context', () => {
    it('should work with full context including dependencies', () => {
      context.modules = [createModule('./src/large.js', 60 * 1024)];
      context.dependencies = [
        {
          importerPath: './src/app.js',
          importedPath: './src/large.js',
          type: 'static',
        },
      ];

      const suggestions = detector.execute(context);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].type).toBe('LARGE_MODULE');
    });

    it('should work with chunks and bundles in context', () => {
      context.modules = [createModule('./src/large.js', 60 * 1024)];
      context.chunks = [createMockChunkInput({ name: 'main' })];
      context.bundles = [createMockBundleInput({ fileName: 'app.js' })];

      const suggestions = detector.execute(context);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].type).toBe('LARGE_MODULE');
    });
  });
});
