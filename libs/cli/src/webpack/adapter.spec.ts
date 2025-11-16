/**
 * Tests for Webpack adapter
 */
import { describe, it, expect, vi } from "vitest";
import { WebpackAdapter } from "./adapter.ts";
import type {
  StatsAsset,
  StatsChunk,
  StatsCompilation,
  StatsModuleReason,
} from "webpack";
import type { ProjectInfo } from "../runner/types.ts";

// Mock file reading utilities
vi.mock("../plugins/utils.ts", async () => {
  const actual = await vi.importActual("../plugins/utils.ts");
  return {
    ...actual,
    readFileContent: vi.fn().mockReturnValue("mock file content"),
  };
});

describe("WebpackAdapter", () => {
  const project: ProjectInfo = {
    name: "test-project",
    path: "/project",
    bundler: "webpack",
    framework: null,
    confidence: "high",
    detectedVia: {
      bundler: [],
      framework: [],
    },
  };

  const outputPath = "/project/dist";

  describe("extract", () => {
    it("should return empty result when no stats available", () => {
      const adapter = new WebpackAdapter(
        project,
        undefined as unknown as StatsCompilation,
      );
      const result = adapter.extract();

      expect(result.bundles).toEqual([]);
      expect(result.modules).toEqual([]);
      expect(result.chunks).toEqual([]);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should extract bundles from webpack stats", () => {
      const mockStats: StatsCompilation = {
        outputPath,
        modules: [],
        chunks: [],
        assets: [
          {
            name: "main.js",
            size: 1000,
            type: "asset",
          } as StatsAsset,
        ],
      };

      const adapter = new WebpackAdapter(project, mockStats);
      const result = adapter.extract();

      expect(result.bundles.length).toBeGreaterThanOrEqual(0);
      expect(result.options.bundlerType).toBe("webpack");
      expect(result.options.projectName).toBe("test-project");
    });

    it("should extract modules from webpack stats", () => {
      const mockStats: StatsCompilation = {
        outputPath,
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
                moduleName: "./src/index.js",
              } as StatsModuleReason,
            ],
          },
        ],
        chunks: [],
        assets: [],
      };

      const adapter = new WebpackAdapter(project, mockStats);
      const result = adapter.extract();

      expect(result.modules.length).toBeGreaterThan(0);
      expect(result.errors).toEqual([]);
    });

    it("should extract chunks from webpack stats", () => {
      const mockStats: StatsCompilation = {
        outputPath,
        modules: [],
        chunks: [
          {
            id: "main",
            names: ["main"],
            files: ["main.js"],
            modules: [],
            entry: true,
            initial: true,
            size: 1000,
          } as Partial<StatsChunk> as StatsChunk,
        ],
        assets: [],
      };

      const adapter = new WebpackAdapter(project, mockStats);
      const result = adapter.extract();

      expect(result.chunks.length).toBeGreaterThan(0);
      expect(result.chunks[0].name).toBe("main");
      expect(result.chunks[0].isEntry).toBe(true);
    });

    it("should handle third-party modules when analyzeThirdParty is false", () => {
      const mockStats: StatsCompilation = {
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
      };

      const adapter = new WebpackAdapter(project, mockStats, {
        analyzeThirdParty: false,
      });

      const result = adapter.extract();

      // Should only include non-third-party modules
      const thirdPartyModules = result.modules.filter((m) =>
        m.filePath.includes("node_modules"),
      );
      expect(thirdPartyModules.length).toBe(0);
    });

    it("should include third-party modules when analyzeThirdParty is true", () => {
      const mockStats: StatsCompilation = {
        outputPath: outputPath,
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
      };

      const adapter = new WebpackAdapter(project, mockStats, {
        analyzeThirdParty: true,
      });

      const result = adapter.extract();

      // Should include third-party modules
      const thirdPartyModules = result.modules.filter((m) =>
        m.filePath.includes("node_modules"),
      );
      expect(thirdPartyModules.length).toBeGreaterThan(0);
    });

    it("should handle chunks with modules", () => {
      const mockStats: StatsCompilation = {
        outputPath,
        modules: [],
        chunks: [
          {
            id: "vendor",
            names: ["vendor"],
            files: ["vendor.js"],
            modules: [
              {
                identifier: "./src/vendor.js",
                name: "./src/vendor.js",
                size: 1500,
                reasons: [],
              },
            ],
            entry: false,
            initial: true,
            size: 1500,
          } as Partial<StatsChunk> as StatsChunk,
        ],
        assets: [],
      };

      const adapter = new WebpackAdapter(project, mockStats);
      const result = adapter.extract();

      expect(result.chunks.length).toBeGreaterThan(0);
      expect(result.chunks[0].moduleIds.length).toBeGreaterThan(0);
      expect(result.modules.length).toBeGreaterThan(0);
    });
  });
});
