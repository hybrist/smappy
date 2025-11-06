/**
 * Tests for Vite plugin
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { viteBundleAnalysisPlugin } from './plugin.js';
import type { VitePluginOptions } from './plugin.js';
import type { Plugin } from 'vite';

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
    it('should have configResolved hook', () => {
      const plugin = viteBundleAnalysisPlugin(baseOptions) as Plugin;

      // Verify the plugin has the configResolved hook
      // We can't test the actual hook execution without a proper plugin context
      expect(plugin.configResolved).toBeDefined();
    });
  });

  describe('writeBundle hook', () => {
    it('should process bundles in writeBundle', () => {
      const plugin = viteBundleAnalysisPlugin(baseOptions) as Plugin;

      expect(plugin.writeBundle).toBeDefined();
    });
    it('should have writeBundle hook for processing bundles', () => {
      const plugin = viteBundleAnalysisPlugin({
        ...baseOptions,
        autoIngest: true,
      }) as Plugin;

      // Verify the plugin has the writeBundle hook
      // The actual hook execution is tested through integration tests
      expect(plugin.writeBundle).toBeDefined();
    });

    it('should have writeBundle hook even when autoIngest is disabled', () => {
      const plugin = viteBundleAnalysisPlugin({
        ...baseOptions,
        autoIngest: false,
      }) as Plugin;

      // Verify the plugin has the writeBundle hook
      expect(plugin.writeBundle).toBeDefined();
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
