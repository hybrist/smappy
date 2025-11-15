/**
 * Tests for Webpack plugin
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  WebpackBundleAnalysisPlugin,
  webpackBundleAnalysisPlugin,
} from "./plugin.ts";
import type { WebpackPluginOptions } from "./plugin.ts";
import type { Compiler, Stats } from "webpack";

// Mock the ingestion module
vi.mock("../../ingestion/index.js", () => ({
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

describe("WebpackBundleAnalysisPlugin", () => {
  const baseOptions: WebpackPluginOptions = {
    projectName: "test-project",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("plugin creation", () => {
    it("should create a webpack plugin instance", () => {
      const plugin = webpackBundleAnalysisPlugin(baseOptions);

      expect(plugin).toBeInstanceOf(WebpackBundleAnalysisPlugin);
    });

    it("should accept optional config", () => {
      const config = { debug: true };
      const plugin = webpackBundleAnalysisPlugin(baseOptions, config);

      expect(plugin).toBeInstanceOf(WebpackBundleAnalysisPlugin);
    });

    it("should support custom options", () => {
      const options: WebpackPluginOptions = {
        ...baseOptions,
        autoIngest: false,
        buildOutputDir: "./custom-dist",
        productionOnly: true,
      };

      const plugin = webpackBundleAnalysisPlugin(options);

      expect(plugin).toBeInstanceOf(WebpackBundleAnalysisPlugin);
    });
  });

  describe("apply method", () => {
    it("should register done hook", () => {
      const plugin = webpackBundleAnalysisPlugin(baseOptions);
      const mockCallback = vi.fn();
      const mockCompiler = {
        hooks: {
          done: {
            tapAsync: vi.fn((_name, callback) => {
              // Store callback for later invocation
              mockCallback.mockImplementation(callback);
            }),
          },
          compilation: {},
        },
        options: {
          mode: "production",
          output: {
            path: "/dist",
          },
        },
      } as unknown as Compiler;

      plugin.apply(mockCompiler);

      expect(mockCompiler.hooks.done.tapAsync).toHaveBeenCalledWith(
        "webpack-bundle-analysis",
        expect.any(Function),
      );
    });

    it("should skip processing when productionOnly is true and mode is not production", () => {
      const plugin = webpackBundleAnalysisPlugin({
        ...baseOptions,
        productionOnly: true,
      });

      const doneCallback = vi.fn();
      const mockCompiler = {
        hooks: {
          done: {
            tapAsync: vi.fn((_name, callback) => {
              // Simulate the callback being called immediately (skipped)
              // Pass mock stats and done callback to the plugin callback
              const mockStats = {
                toJson: vi.fn().mockReturnValue({}),
                compilation: {},
              } as unknown as Stats;
              callback(mockStats, doneCallback);
            }),
          },
          compilation: {},
        },
        options: {
          mode: "development",
          output: {
            path: "/dist",
          },
        },
      } as unknown as Compiler;

      plugin.apply(mockCompiler);

      // The callback should be called immediately without processing
      expect(mockCompiler.hooks.done.tapAsync).toHaveBeenCalled();
      expect(doneCallback).toHaveBeenCalled();
    });

    it("should process when productionOnly is false", async () => {
      const plugin = webpackBundleAnalysisPlugin({
        ...baseOptions,
        productionOnly: false,
      });

      const mockStats = {
        toJson: vi.fn().mockReturnValue({
          modules: [],
          chunks: [],
          assets: [],
        }),
        compilation: {},
      } as unknown as Stats;

      const doneCallback = vi.fn();
      const mockCompiler = {
        hooks: {
          done: {
            tapAsync: vi.fn((_name, callback) => {
              // Simulate async processing
              setTimeout(() => callback(mockStats, doneCallback), 0);
            }),
          },
          compilation: {},
        },
        options: {
          mode: "development",
          output: {
            path: "/dist",
          },
        },
      } as unknown as Compiler;

      plugin.apply(mockCompiler);

      expect(mockCompiler.hooks.done.tapAsync).toHaveBeenCalled();

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(doneCallback).toHaveBeenCalled();
    });
  });
});
