/**
 * Tests for Webpack plugin
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { WebpackSmappyPlugin } from "./plugin.ts";
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
    statsFile: "/tmp/test-project.stats.json",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("apply method", () => {
    it("should register done hook", () => {
      const plugin = new WebpackSmappyPlugin(baseOptions);
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
        "webpack-smappy-analysis",
        expect.any(Function),
      );
    });
  });
});
