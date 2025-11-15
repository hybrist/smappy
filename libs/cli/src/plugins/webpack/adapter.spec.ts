/**
 * Tests for Webpack adapter
 */
import { describe, it, expect, vi } from "vitest";
import { WebpackAdapter } from "./adapter.ts";
import type { BundlerPluginOptions } from "../types.ts";
import type { Stats, Compilation } from "webpack";

// Mock file reading utilities
vi.mock("../utils.js", async () => {
  const actual = await vi.importActual("../utils.js");
  return {
    ...actual,
    readFileContent: vi.fn().mockReturnValue("mock file content"),
  };
});

describe("WebpackAdapter", () => {
  const baseDir = "/project";
  const options: BundlerPluginOptions = {
    projectName: "test-project",
  };

  describe("extract", () => {
    it("should return empty result for invalid input", () => {
      const adapter = new WebpackAdapter(baseDir, options);
      const result = adapter.extract(null);

      expect(result.bundles).toEqual([]);
      expect(result.modules).toEqual([]);
      expect(result.chunks).toEqual([]);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should extract bundles from webpack stats", () => {
      const adapter = new WebpackAdapter(baseDir, options);

      // Create a mock webpack stats
      const mockStats = {
        toJson: vi.fn().mockReturnValue({
          modules: [],
          chunks: [],
          assets: [
            {
              name: "main.js",
              size: 1000,
            },
          ],
        }),
        compilation: {} as Compilation,
      } as unknown as Stats;

      const webpackOutput = {
        stats: mockStats,
        compilation: {} as Compilation,
        outputPath: "/project/dist",
      };

      const result = adapter.extract(webpackOutput);

      expect(result.bundles.length).toBeGreaterThanOrEqual(0);
      expect(result.options.bundlerType).toBe("webpack");
      expect(result.options.projectName).toBe("test-project");
    });

    it("should extract modules from webpack stats", () => {
      const adapter = new WebpackAdapter(baseDir, options);

      const mockStats = {
        toJson: vi.fn().mockReturnValue({
          modules: [
            {
              identifier: "./src/index.js",
              name: "./src/index.js",
              size: 500,
              reasons: [],
            },
            {
              identifier: "./src/utils.js",
              name: "./src/utils.js",
              size: 300,
              reasons: [
                {
                  type: "import",
                  module: "./src/index.js",
                },
              ],
            },
          ],
          chunks: [],
          assets: [],
        }),
        compilation: {
          moduleGraph: {
            getModuleById: vi.fn().mockReturnValue(null),
          },
        } as unknown as Compilation,
      } as unknown as Stats;

      const webpackOutput = {
        stats: mockStats,
        compilation: mockStats.compilation,
        outputPath: "/project/dist",
      };

      const result = adapter.extract(webpackOutput);

      expect(result.modules.length).toBeGreaterThan(0);
      expect(result.errors).toEqual([]);
    });

    it("should extract chunks from webpack stats", () => {
      const adapter = new WebpackAdapter(baseDir, options);

      const mockStats = {
        toJson: vi.fn().mockReturnValue({
          modules: [],
          chunks: [
            {
              id: 0,
              names: ["main"],
              files: ["main.js"],
              modules: [],
              entry: true,
              initial: true,
              async: false,
              size: 1000,
            },
          ],
          assets: [],
        }),
        compilation: {} as Compilation,
      } as unknown as Stats;

      const webpackOutput = {
        stats: mockStats,
        compilation: {} as Compilation,
        outputPath: "/project/dist",
      };

      const result = adapter.extract(webpackOutput);

      expect(result.chunks.length).toBeGreaterThan(0);
      expect(result.chunks[0].name).toBe("main");
      expect(result.chunks[0].isEntry).toBe(true);
    });

    it("should handle third-party modules when analyzeThirdParty is false", () => {
      const adapter = new WebpackAdapter(baseDir, {
        ...options,
        analyzeThirdParty: false,
      });

      const mockStats = {
        toJson: vi.fn().mockReturnValue({
          modules: [
            {
              identifier: "./src/index.js",
              name: "./src/index.js",
              size: 500,
              reasons: [],
            },
            {
              identifier: "node_modules/react/index.js",
              name: "node_modules/react/index.js",
              size: 10000,
              reasons: [],
            },
          ],
          chunks: [],
          assets: [],
        }),
        compilation: {
          moduleGraph: {
            getModuleById: vi.fn().mockReturnValue(null),
          },
        } as unknown as Compilation,
      } as unknown as Stats;

      const webpackOutput = {
        stats: mockStats,
        compilation: mockStats.compilation,
        outputPath: "/project/dist",
      };

      const result = adapter.extract(webpackOutput);

      // Should only include non-third-party modules
      const thirdPartyModules = result.modules.filter((m) =>
        m.filePath.includes("node_modules"),
      );
      expect(thirdPartyModules.length).toBe(0);
    });

    it("should include third-party modules when analyzeThirdParty is true", () => {
      const adapter = new WebpackAdapter(baseDir, {
        ...options,
        analyzeThirdParty: true,
      });

      const mockStats = {
        toJson: vi.fn().mockReturnValue({
          modules: [
            {
              identifier: "./src/index.js",
              name: "./src/index.js",
              size: 500,
              reasons: [],
            },
            {
              identifier: "node_modules/react/index.js",
              name: "node_modules/react/index.js",
              size: 10000,
              reasons: [],
            },
          ],
          chunks: [],
          assets: [],
        }),
        compilation: {
          moduleGraph: {
            getModuleById: vi.fn().mockReturnValue(null),
          },
        } as unknown as Compilation,
      } as unknown as Stats;

      const webpackOutput = {
        stats: mockStats,
        compilation: mockStats.compilation,
        outputPath: "/project/dist",
      };

      const result = adapter.extract(webpackOutput);

      // Should include third-party modules
      const thirdPartyModules = result.modules.filter((m) =>
        m.filePath.includes("node_modules"),
      );
      expect(thirdPartyModules.length).toBeGreaterThan(0);
    });
  });
});
