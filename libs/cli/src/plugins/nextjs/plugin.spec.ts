/**
 * Tests for Next.js bundle analysis plugin
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Compiler, Stats, Configuration } from "webpack";
import {
  NextJsBundleAnalysisPlugin,
  nextJsBundleAnalysisPlugin,
  withNextBundleAnalysis,
  type NextWebpackBuildContext,
} from "./plugin.js";
import type { NextJsPluginOptions } from "./plugin.js";

// Mock ingestion to avoid touching the database layer
vi.mock("../../ingestion/index.js", () => ({
  ingestBundle: vi.fn().mockResolvedValue({
    analysisRunId: 42,
    bundlesWritten: 2,
    modulesWritten: 10,
    chunksWritten: 4,
    statistics: {
      totalBundles: 2,
      totalModules: 10,
      totalChunks: 4,
    },
  }),
}));

describe("NextJsBundleAnalysisPlugin", () => {
  const baseOptions: NextJsPluginOptions = {
    projectName: "test-next-app",
    buildTarget: "client",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should construct via factory and register webpack hook", () => {
    const plugin = nextJsBundleAnalysisPlugin(baseOptions);
    expect(plugin).toBeInstanceOf(NextJsBundleAnalysisPlugin);

    const compilerHooks = {
      done: {
        tapAsync: vi.fn(),
      },
    };

    const mockCompiler = {
      hooks: compilerHooks,
      options: {
        mode: "production",
        output: {
          path: "/project/.next",
        },
      },
    } as unknown as Compiler;

    plugin.apply(mockCompiler);

    expect(compilerHooks.done.tapAsync).toHaveBeenCalledWith(
      "nextjs-bundle-analysis:client",
      expect.any(Function),
    );
  });

  it("should skip processing when productionOnly is true and mode is development", () => {
    const plugin = nextJsBundleAnalysisPlugin({
      ...baseOptions,
      productionOnly: true,
    });

    const doneCallback = vi.fn();
    const compilerHooks = {
      done: {
        tapAsync: vi.fn((_name, callback) => {
          const mockStats = {
            toJson: vi.fn().mockReturnValue({}),
            compilation: {},
          } as unknown as Stats;
          callback(mockStats, doneCallback);
        }),
      },
    };

    const mockCompiler = {
      hooks: compilerHooks,
      options: {
        mode: "development",
        output: { path: "/project/.next" },
      },
    } as unknown as Compiler;

    plugin.apply(mockCompiler);

    expect(compilerHooks.done.tapAsync).toHaveBeenCalled();
    expect(doneCallback).toHaveBeenCalled();
  });
});

describe("withNextBundleAnalysis", () => {
  const baseOptions: NextJsPluginOptions = {
    projectName: "test-next-app",
    buildTarget: "client",
  };

  it("should inject plugin for client builds by default", () => {
    const wrapped = withNextBundleAnalysis(
      {},
      { projectName: baseOptions.projectName },
    );

    const webpackConfig: Configuration = { plugins: [] };
    const context: NextWebpackBuildContext = {
      dir: "/project",
      dev: false,
      isServer: false,
      config: {},
      webpack: {} as NextWebpackBuildContext["webpack"],
    };

    const result = wrapped.webpack!(webpackConfig, context);
    const resultConfig = result ?? webpackConfig;

    expect(resultConfig.plugins).toHaveLength(1);
    expect(resultConfig.plugins?.[0]).toBeInstanceOf(
      NextJsBundleAnalysisPlugin,
    );
  });

  it("should honor analyzeServer flag", () => {
    const wrapped = withNextBundleAnalysis(
      {},
      {
        projectName: baseOptions.projectName,
        analyzeClient: false,
        analyzeServer: true,
      },
    );

    const webpackConfig: Configuration = { plugins: [] };
    const context: NextWebpackBuildContext = {
      dir: "/project",
      dev: false,
      isServer: true,
      config: {},
      webpack: {} as NextWebpackBuildContext["webpack"],
    };

    const result = wrapped.webpack!(webpackConfig, context);
    const resultConfig = result ?? webpackConfig;

    expect(resultConfig.plugins).toHaveLength(1);
    expect(resultConfig.plugins?.[0]).toBeInstanceOf(
      NextJsBundleAnalysisPlugin,
    );
  });
});
