/**
 * Tests for Angular plugin
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { angularBundleAnalysisBuilder } from "./plugin.ts";
import type { AngularBuilderOptions } from "./plugin.ts";
import * as fs from "node:fs";
import * as ingestion from "../../ingestion/index.ts";

// Mock file system
vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  return {
    ...actual,
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    readdirSync: vi.fn(),
    statSync: vi.fn(),
  };
});

// Mock ingestion
vi.mock("../../ingestion/index.js", () => ({
  ingestBundle: vi.fn(),
}));

describe("angularBundleAnalysisBuilder", () => {
  const baseOptions: AngularBuilderOptions = {
    projectName: "test-app",
    autoIngest: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(ingestion.ingestBundle).mockResolvedValue({
      analysisRunId: 1,
      stats: {
        modulesWritten: 0,
        symbolsWritten: 0,
        dependenciesWritten: 0,
        chunksWritten: 0,
        bundlesWritten: 0,
        sourceMapEntriesWritten: 0,
        suggestionsWritten: 0,
      },
      errors: [],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should successfully analyze a build with stats.json", async () => {
    const mockStats = {
      chunks: [
        {
          id: "main",
          names: ["main"],
          files: ["main.js"],
          entry: true,
          modules: [],
        },
      ],
      modules: [],
      assets: [
        {
          name: "main.js",
          size: 1024,
        },
      ],
    };

    vi.mocked(fs.readFileSync)
      .mockReturnValueOnce(JSON.stringify(mockStats)) // stats.json
      .mockReturnValueOnce('console.log("app");'); // main.js

    const result = await angularBundleAnalysisBuilder(baseOptions);

    expect(result.success).toBe(true);
    expect(ingestion.ingestBundle).toHaveBeenCalledOnce();
  });

  it("should fail when output directory does not exist", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = await angularBundleAnalysisBuilder(baseOptions);

    expect(result.success).toBe(false);
    expect(ingestion.ingestBundle).not.toHaveBeenCalled();
  });

  it("should work without stats.json using directory scan", async () => {
    vi.mocked(fs.existsSync).mockImplementation((path: unknown) => {
      // Output dir exists, but stats.json doesn't
      return !String(path).includes("stats.json");
    });

    vi.mocked(fs.readdirSync).mockReturnValue([
      { name: "main.js", isDirectory: () => false, isFile: () => true },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any);
    vi.mocked(fs.statSync).mockReturnValue({
      isFile: () => true,
      size: 1024,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    vi.mocked(fs.readFileSync).mockReturnValue('console.log("app");');

    const result = await angularBundleAnalysisBuilder(baseOptions);

    expect(result.success).toBe(true);
    expect(ingestion.ingestBundle).toHaveBeenCalledOnce();
  });

  it("should respect autoIngest option", async () => {
    vi.mocked(fs.readFileSync).mockReturnValue("{}");

    const options: AngularBuilderOptions = {
      ...baseOptions,
      autoIngest: false,
    };

    const result = await angularBundleAnalysisBuilder(options);

    expect(result.success).toBe(true);
    expect(ingestion.ingestBundle).not.toHaveBeenCalled();
  });

  it("should use custom output directory when provided", async () => {
    const customOutputDir = "custom-dist";
    const options: AngularBuilderOptions = {
      ...baseOptions,
      buildOutputDir: customOutputDir,
    };

    vi.mocked(fs.readFileSync).mockReturnValue("{}");

    const result = await angularBundleAnalysisBuilder(options);

    expect(result.success).toBe(true);
  });

  it("should handle ingestion errors gracefully", async () => {
    vi.mocked(fs.readFileSync).mockReturnValue("{}");
    vi.mocked(ingestion.ingestBundle).mockRejectedValue(
      new Error("Ingestion failed"),
    );

    const result = await angularBundleAnalysisBuilder(baseOptions);

    expect(result.success).toBe(false);
  });

  it("should use custom logger when provided", async () => {
    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    vi.mocked(fs.readFileSync).mockReturnValue("{}");

    const context = {
      workspaceRoot: "/custom/root",
      logger: mockLogger,
    };

    const result = await angularBundleAnalysisBuilder(baseOptions, context);

    expect(result.success).toBe(true);
    expect(mockLogger.info).toHaveBeenCalled();
  });

  it("should handle stats.json parse errors", async () => {
    vi.mocked(fs.readFileSync).mockReturnValue("invalid json");

    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    const context = {
      logger: mockLogger,
    };

    await angularBundleAnalysisBuilder(baseOptions, context);

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining("Failed to load stats.json"),
    );
  });

  it("should disable stats.json when useStatsJson is false", async () => {
    const options: AngularBuilderOptions = {
      ...baseOptions,
      useStatsJson: false,
    };

    vi.mocked(fs.readdirSync).mockReturnValue([
      { name: "main.js", isDirectory: () => false, isFile: () => true },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any);
    vi.mocked(fs.statSync).mockReturnValue({
      isFile: () => true,
      size: 1024,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    vi.mocked(fs.readFileSync).mockReturnValue('console.log("app");');

    const result = await angularBundleAnalysisBuilder(options);

    expect(result.success).toBe(true);
    // Should not try to read stats.json
    expect(vi.mocked(fs.readFileSync)).not.toHaveBeenCalledWith(
      expect.stringContaining("stats.json"),
      "utf-8",
    );
  });
});
