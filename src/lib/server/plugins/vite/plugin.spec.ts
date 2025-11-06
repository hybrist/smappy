/**
 * Tests for Vite plugin
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { viteBundleAnalysisPlugin } from './plugin.js';
import type { VitePluginOptions } from './plugin.js';
import type { Plugin } from 'vite';
import type { OutputBundle } from 'rollup';

// Mock the ingestion module
vi.mock('../../ingestion/index.js', () => ({
  ingestBundle: vi.fn().mockResolvedValue({
    analysisRunId: 1,
    bundlesWritten: 1,
    modulesWritten: 5,
    chunksWritten: 2,
    statistics: {
      totalBundles: 1,
      totalModules: 5,
      totalChunks: 2,
    },
  }),
}));

describe('viteBundleAnalysisPlugin', () => {
  const baseOptions: VitePluginOptions = {
    projectName: 'test-project',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('plugin creation', () => {
    it('should create a Vite plugin', () => {
      const plugin = viteBundleAnalysisPlugin(baseOptions);

      expect(plugin).toBeDefined();
      expect(plugin.name).toBe('vite-bundle-analysis');
      expect(plugin.enforce).toBe('post');
    });

    it('should accept optional config', () => {
      const config = { debug: true };
      const plugin = viteBundleAnalysisPlugin(baseOptions, config);

      expect(plugin).toBeDefined();
    });

    it('should support custom options', () => {
      const options: VitePluginOptions = {
        ...baseOptions,
        autoIngest: false,
        buildOutputDir: './custom-dist',
        handleSSR: false,
      };

      const plugin = viteBundleAnalysisPlugin(options);

      expect(plugin).toBeDefined();
    });
  });

  describe('configResolved hook', () => {
    it('should capture root and output directory', () => {
      const plugin = viteBundleAnalysisPlugin(baseOptions) as Plugin;

      const mockConfig = {
        root: '/project',
        build: {
          outDir: 'dist',
        },
      };

      if (plugin.configResolved) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        plugin.configResolved(mockConfig as any);
      }

      // The plugin should have captured the config
      // We can't directly test this, but we can verify the plugin structure
      expect(plugin.configResolved).toBeDefined();
    });
  });

  describe('writeBundle hook', () => {
    it('should process bundles in writeBundle', () => {
      const plugin = viteBundleAnalysisPlugin(baseOptions) as Plugin;

      expect(plugin.writeBundle).toBeDefined();
    });
    it('should process bundles and call ingestion when autoIngest is enabled', async () => {
      const { ingestBundle } = await import('../../ingestion/index.js');
      const plugin = viteBundleAnalysisPlugin({
        ...baseOptions,
        autoIngest: true,
      }) as Plugin;

      const mockBundle: OutputBundle = {
        'main.js': {
          type: 'chunk',
          fileName: 'main.js',
          name: 'main',
          code: 'console.log("hello");',
          isEntry: true,
          isDynamicEntry: false,
          imports: [],
          dynamicImports: [],
          facadeModuleId: 'src/main.js',
          isImported: false,
          modules: {
            'src/main.js': {
              renderedLength: 25,
            },
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      };

      const mockOptions = {
        format: 'es' as const,
        ssr: false,
      };

      // Mock configResolved first
      if (plugin.configResolved) {
        plugin.configResolved({
          root: process.cwd(),
          build: { outDir: 'dist' },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
      }

      // Call writeBundle
      if (plugin.writeBundle) {
        await plugin.writeBundle(mockOptions, mockBundle);
      }

      // Should have called ingestBundle
      expect(vi.mocked(ingestBundle)).toHaveBeenCalled();
    });

    it('should not call ingestion when autoIngest is disabled', async () => {
      const { ingestBundle } = await import('../../ingestion/index.js');
      const plugin = viteBundleAnalysisPlugin({
        ...baseOptions,
        autoIngest: false,
      }) as Plugin;

      const mockBundle: OutputBundle = {
        'main.js': {
          type: 'chunk',
          fileName: 'main.js',
          name: 'main',
          code: 'console.log("hello");',
          isEntry: true,
          isDynamicEntry: false,
          imports: [],
          dynamicImports: [],
          facadeModuleId: 'src/main.js',
          isImported: false,
          modules: {},
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      };

      const mockOptions = {
        format: 'es' as const,
        ssr: false,
      };

      // Mock configResolved first
      if (plugin.configResolved) {
        plugin.configResolved({
          root: process.cwd(),
          build: { outDir: 'dist' },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
      }

      // Call writeBundle
      if (plugin.writeBundle) {
        await plugin.writeBundle(mockOptions, mockBundle);
      }

      // Should not have called ingestBundle
      expect(vi.mocked(ingestBundle)).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const plugin = viteBundleAnalysisPlugin(baseOptions) as Plugin;

      // Mock configResolved first
      if (plugin.configResolved) {
        plugin.configResolved({
          root: process.cwd(),
          build: { outDir: 'dist' },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
      }

      // Pass invalid bundle
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const invalidBundle = null as any;

      const mockOptions = {
        format: 'es' as const,
        ssr: false,
      };

      // Call writeBundle with invalid bundle
      if (plugin.writeBundle) {
        await plugin.writeBundle(mockOptions, invalidBundle);
      }

      // Should have logged an error
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('default export', () => {
    it('should export default function', async () => {
      const pluginModule = await import('./plugin.js');
      expect(pluginModule.default).toBeDefined();
      expect(typeof pluginModule.default).toBe('function');
    });
  });
});
