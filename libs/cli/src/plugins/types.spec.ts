/**
 * Tests for plugin types and interfaces
 */
import { describe, it, expect } from 'vitest';
import type {
  BundlerPluginOptions,
  PluginConfig,
  PluginExtractionResult,
  BundlerPlugin,
  BundlerModule,
  BundlerChunk,
  BundlerBundle,
} from './types.ts';
import { isBundlerPlugin, isBundlerModule, isBundlerChunk } from './types.ts';

describe('Plugin Types', () => {
  describe('BundlerPluginOptions', () => {
    it('should have required projectName field', () => {
      const options: BundlerPluginOptions = {
        projectName: 'test-project',
      };
      expect(options.projectName).toBe('test-project');
    });

    it('should support optional fields', () => {
      const options: BundlerPluginOptions = {
        projectName: 'test-project',
        outputDir: './output',
        extractSourceMaps: true,
        analyzeThirdParty: false,
        excludePatterns: ['**/node_modules/**'],
        includePatterns: ['**/*.ts', '**/*.tsx'],
      };
      expect(options.excludePatterns).toHaveLength(1);
      expect(options.includePatterns).toHaveLength(2);
    });
  });

  describe('PluginConfig', () => {
    it('should support debug mode', () => {
      const config: PluginConfig = {
        debug: true,
      };
      expect(config.debug).toBe(true);
    });

    it('should support path mappings', () => {
      const config: PluginConfig = {
        pathMappings: {
          '@app': './src',
          '@lib': './src/lib',
        },
      };
      expect(config.pathMappings?.['@app']).toBe('./src');
      expect(config.pathMappings?.['@lib']).toBe('./src/lib');
    });
  });

  describe('PluginExtractionResult', () => {
    it('should have all required fields', () => {
      const result: PluginExtractionResult = {
        bundles: [],
        modules: [],
        chunks: [],
        options: {
          bundlerType: 'webpack',
          projectName: 'test',
        },
        warnings: [],
        errors: [],
      };
      expect(result.bundles).toEqual([]);
      expect(result.modules).toEqual([]);
      expect(result.chunks).toEqual([]);
      expect(result.warnings).toEqual([]);
      expect(result.errors).toEqual([]);
    });
  });

  describe('BundlerPlugin interface', () => {
    it('should be implementable by a class', () => {
      class TestPlugin implements BundlerPlugin {
        readonly bundlerName = 'test';
        readonly bundlerVersion = '1.0.0';

        extract(
          _bundlerOutput: unknown,
          _options: BundlerPluginOptions,
          _config?: PluginConfig,
        ): PluginExtractionResult {
          return {
            bundles: [],
            modules: [],
            chunks: [],
            options: {
              bundlerType: 'webpack',
              projectName: 'test',
            },
            warnings: [],
            errors: [],
          };
        }
      }

      const plugin = new TestPlugin();
      expect(plugin.bundlerName).toBe('test');
      expect(plugin.bundlerVersion).toBe('1.0.0');
      expect(typeof plugin.extract).toBe('function');
    });

    it('should support async extract', async () => {
      class TestPlugin implements BundlerPlugin {
        readonly bundlerName = 'test';

        async extract(
          _bundlerOutput: unknown,
          _options: BundlerPluginOptions,
          _config?: PluginConfig,
        ): Promise<PluginExtractionResult> {
          return {
            bundles: [],
            modules: [],
            chunks: [],
            options: {
              bundlerType: 'webpack',
              projectName: 'test',
            },
            warnings: [],
            errors: [],
          };
        }
      }

      const plugin = new TestPlugin();
      const result = await plugin.extract({}, { projectName: 'test' });
      expect(result.bundles).toEqual([]);
    });
  });

  describe('BundlerModule', () => {
    it('should have required identifier field', () => {
      const module: BundlerModule = {
        identifier: './src/index.js',
      };
      expect(module.identifier).toBe('./src/index.js');
    });

    it('should support optional fields', () => {
      const module: BundlerModule = {
        identifier: './src/index.js',
        name: 'index',
        size: 1024,
        source: 'export default function() {}',
        sourceMap: '{"version":3}',
        dependencies: ['./utils.js'],
        reasons: [
          {
            type: 'entry',
            module: './src/index.js',
          },
        ],
      };
      expect(module.size).toBe(1024);
      expect(module.dependencies).toHaveLength(1);
      expect(module.reasons).toHaveLength(1);
    });
  });

  describe('BundlerChunk', () => {
    it('should have required name field', () => {
      const chunk: BundlerChunk = {
        name: 'main',
      };
      expect(chunk.name).toBe('main');
    });

    it('should support optional fields', () => {
      const chunk: BundlerChunk = {
        name: 'vendor',
        size: 5120,
        modules: ['./src/index.js', './src/utils.js'],
        isEntry: true,
        isAsync: false,
        files: ['vendor.js', 'vendor.js.map'],
      };
      expect(chunk.size).toBe(5120);
      expect(chunk.modules).toHaveLength(2);
      expect(chunk.isEntry).toBe(true);
      expect(chunk.files).toHaveLength(2);
    });
  });

  describe('BundlerBundle', () => {
    it('should have required fileName field', () => {
      const bundle: BundlerBundle = {
        fileName: 'bundle.js',
      };
      expect(bundle.fileName).toBe('bundle.js');
    });

    it('should support optional fields', () => {
      const bundle: BundlerBundle = {
        fileName: 'bundle.js',
        content: 'console.log("Hello");',
        size: 2048,
        sourceMap: '{"version":3}',
        chunks: ['main', 'vendor'],
      };
      expect(bundle.content).toBe('console.log("Hello");');
      expect(bundle.size).toBe(2048);
      expect(bundle.chunks).toHaveLength(2);
    });
  });
});

describe('Type Guards', () => {
  describe('isBundlerPlugin', () => {
    it('should return true for valid BundlerPlugin', () => {
      const plugin: BundlerPlugin = {
        bundlerName: 'test',
        extract: () => ({
          bundles: [],
          modules: [],
          chunks: [],
          options: { bundlerType: 'webpack', projectName: 'test' },
          warnings: [],
          errors: [],
        }),
      };
      expect(isBundlerPlugin(plugin)).toBe(true);
    });

    it('should return false for invalid objects', () => {
      expect(isBundlerPlugin({})).toBe(false);
      expect(isBundlerPlugin({ bundlerName: 'test' })).toBe(false);
      expect(isBundlerPlugin({ extract: () => {} })).toBe(false);
      expect(isBundlerPlugin(null)).toBe(false);
      expect(isBundlerPlugin(undefined)).toBe(false);
      expect(isBundlerPlugin('string')).toBe(false);
      expect(isBundlerPlugin(123)).toBe(false);
    });
  });

  describe('isBundlerModule', () => {
    it('should return true for valid BundlerModule', () => {
      const module: BundlerModule = {
        identifier: './src/index.js',
      };
      expect(isBundlerModule(module)).toBe(true);
    });

    it('should return false for invalid objects', () => {
      expect(isBundlerModule({})).toBe(false);
      expect(isBundlerModule({ name: 'test' })).toBe(false);
      expect(isBundlerModule(null)).toBe(false);
      expect(isBundlerModule(undefined)).toBe(false);
      expect(isBundlerModule('string')).toBe(false);
    });
  });

  describe('isBundlerChunk', () => {
    it('should return true for valid BundlerChunk', () => {
      const chunk: BundlerChunk = {
        name: 'main',
      };
      expect(isBundlerChunk(chunk)).toBe(true);
    });

    it('should return false for invalid objects', () => {
      expect(isBundlerChunk({})).toBe(false);
      expect(isBundlerChunk({ id: 'main' })).toBe(false);
      expect(isBundlerChunk(null)).toBe(false);
      expect(isBundlerChunk(undefined)).toBe(false);
      expect(isBundlerChunk('string')).toBe(false);
    });
  });
});
