/**
 * Tests for adapter pattern
 */
import { describe, it, expect } from "vitest";
import {
  BundlerAdapter,
  AdapterRegistry,
  createDefaultAdapter,
  type AdapterFactory,
} from "./adapters.ts";
import type { BundlerPluginOptions, PluginConfig } from "./types.ts";
import type { PluginExtractionResult } from "./types.ts";

describe("BundlerAdapter", () => {
  const baseDir = "/project";
  const options: BundlerPluginOptions = {
    projectName: "test-project",
  };

  class TestAdapter extends BundlerAdapter {
    extract(_bundlerOutput: unknown): PluginExtractionResult {
      return {
        bundles: [],
        modules: [],
        chunks: [],
        options: {
          bundlerType: "webpack",
          projectName: this.options.projectName,
        },
        warnings: [],
        errors: [],
      };
    }
  }

  describe("constructor", () => {
    it("should initialize with baseDir, options, and config", () => {
      const adapter = new TestAdapter(baseDir, options);
      expect(adapter).toBeInstanceOf(BundlerAdapter);
    });

    it("should use process.cwd() if baseDir is empty", () => {
      const adapter = new TestAdapter("", options);
      expect(adapter).toBeInstanceOf(BundlerAdapter);
    });

    it("should accept optional config", () => {
      const config: PluginConfig = { debug: true };
      const adapter = new TestAdapter(baseDir, options, config);
      expect(adapter).toBeInstanceOf(BundlerAdapter);
    });
  });

  describe("extract", () => {
    it("should be implemented by subclasses", () => {
      const adapter = new TestAdapter(baseDir, options);
      const result = adapter.extract({});
      expect(result).toBeDefined();
      expect(result.options.projectName).toBe("test-project");
    });
  });

  describe("convertModules", () => {
    it("should convert bundler modules to ModuleInput", () => {
      class TestAdapter extends BundlerAdapter {
        extract(_bundlerOutput: unknown): PluginExtractionResult {
          const errors: string[] = [];
          const modules = this.convertModules(
            [
              {
                identifier: "./src/index.js",
                source: "export default function() {}",
              },
            ],
            errors,
          );
          return {
            bundles: [],
            modules,
            chunks: [],
            options: {
              bundlerType: "webpack",
              projectName: this.options.projectName,
            },
            warnings: [],
            errors,
          };
        }
      }

      const adapter = new TestAdapter(baseDir, options);
      const result = adapter.extract({});
      expect(result.modules).toHaveLength(1);
      expect(result.modules[0].filePath).toContain("src/index.js");
      expect(result.modules[0].sourceContent).toBe(
        "export default function() {}",
      );
    });

    it("should filter out excluded patterns", () => {
      class TestAdapter extends BundlerAdapter {
        extract(_bundlerOutput: unknown): PluginExtractionResult {
          const errors: string[] = [];
          const modules = this.convertModules(
            [
              {
                identifier: "./src/index.js",
                source: "export default function() {}",
              },
              {
                identifier: "./src/test.js",
                source: "test",
              },
            ],
            errors,
          );
          return {
            bundles: [],
            modules,
            chunks: [],
            options: {
              bundlerType: "webpack",
              projectName: this.options.projectName,
            },
            warnings: [],
            errors,
          };
        }
      }

      const opts: BundlerPluginOptions = {
        ...options,
        excludePatterns: ["**/test.js"],
      };
      const adapter = new TestAdapter(baseDir, opts);
      const result = adapter.extract({});
      expect(result.modules).toHaveLength(1);
      expect(result.modules[0].filePath).not.toContain("test.js");
    });

    it("should filter out third-party modules when configured", () => {
      class TestAdapter extends BundlerAdapter {
        extract(_bundlerOutput: unknown): PluginExtractionResult {
          const errors: string[] = [];
          const modules = this.convertModules(
            [
              {
                identifier: "./src/index.js",
                source: "export default function() {}",
              },
              {
                identifier: "./node_modules/lodash/index.js",
                source: "lodash code",
              },
            ],
            errors,
          );
          return {
            bundles: [],
            modules,
            chunks: [],
            options: {
              bundlerType: "webpack",
              projectName: this.options.projectName,
            },
            warnings: [],
            errors,
          };
        }
      }

      const opts: BundlerPluginOptions = {
        ...options,
        analyzeThirdParty: false,
      };
      const adapter = new TestAdapter(baseDir, opts);
      const result = adapter.extract({});
      expect(result.modules).toHaveLength(1);
      expect(result.modules[0].filePath).not.toContain("node_modules");
    });
  });

  describe("convertChunks", () => {
    it("should convert bundler chunks to ChunkInput", () => {
      class TestAdapter extends BundlerAdapter {
        extract(_bundlerOutput: unknown): PluginExtractionResult {
          const errors: string[] = [];
          const chunks = this.convertChunks(
            [
              {
                name: "main",
                isEntry: true,
                isAsync: false,
                modules: ["./src/index.js"],
              },
            ],
            errors,
          );
          return {
            bundles: [],
            modules: [],
            chunks,
            options: {
              bundlerType: "webpack",
              projectName: this.options.projectName,
            },
            warnings: [],
            errors,
          };
        }
      }

      const adapter = new TestAdapter(baseDir, options);
      const result = adapter.extract({});
      expect(result.chunks).toHaveLength(1);
      expect(result.chunks[0].name).toBe("main");
      expect(result.chunks[0].isEntry).toBe(true);
      expect(result.chunks[0].isAsync).toBe(false);
      expect(result.chunks[0].moduleIds).toEqual(["./src/index.js"]);
    });
  });

  describe("createIngestionOptions", () => {
    it("should create IngestionOptions from plugin options", () => {
      class TestAdapter extends BundlerAdapter {
        extract(_bundlerOutput: unknown): PluginExtractionResult {
          const options = this.createIngestionOptions("webpack");
          return {
            bundles: [],
            modules: [],
            chunks: [],
            options,
            warnings: [],
            errors: [],
          };
        }
      }

      const opts: BundlerPluginOptions = {
        projectName: "test-project",
        enableIncremental: true,
        compareWithPrevious: true,
        maxHistorySize: 20,
      };
      const adapter = new TestAdapter(baseDir, opts);
      const result = adapter.extract({});
      expect(result.options.bundlerType).toBe("webpack");
      expect(result.options.projectName).toBe("test-project");
      expect(result.options.enableIncremental).toBe(true);
      expect(result.options.compareWithPrevious).toBe(true);
      expect(result.options.maxHistorySize).toBe(20);
    });
  });
});

describe("AdapterRegistry", () => {
  describe("register and get", () => {
    it("should register and retrieve adapter factories", () => {
      const registry = new AdapterRegistry();
      const factory: AdapterFactory = (baseDir, options) => {
        return createDefaultAdapter(baseDir, options);
      };

      registry.register("webpack", factory);
      expect(registry.has("webpack")).toBe(true);
      expect(registry.get("webpack")).toBe(factory);
    });

    it("should be case-insensitive", () => {
      const registry = new AdapterRegistry();
      const factory: AdapterFactory = () =>
        createDefaultAdapter("", { projectName: "test" });

      registry.register("WEBPACK", factory);
      expect(registry.has("webpack")).toBe(true);
      expect(registry.has("Webpack")).toBe(true);
      expect(registry.get("webpack")).toBe(factory);
    });
  });

  describe("has", () => {
    it("should return false for unregistered adapters", () => {
      const registry = new AdapterRegistry();
      expect(registry.has("webpack")).toBe(false);
    });

    it("should return true for registered adapters", () => {
      const registry = new AdapterRegistry();
      registry.register("webpack", () =>
        createDefaultAdapter("", { projectName: "test" }),
      );
      expect(registry.has("webpack")).toBe(true);
    });
  });

  describe("list", () => {
    it("should return list of registered bundler names", () => {
      const registry = new AdapterRegistry();
      registry.register("webpack", () =>
        createDefaultAdapter("", { projectName: "test" }),
      );
      registry.register("vite", () =>
        createDefaultAdapter("", { projectName: "test" }),
      );
      registry.register("rollup", () =>
        createDefaultAdapter("", { projectName: "test" }),
      );

      const list = registry.list();
      expect(list).toContain("webpack");
      expect(list).toContain("vite");
      expect(list).toContain("rollup");
      expect(list.length).toBe(3);
    });

    it("should return empty array when no adapters registered", () => {
      const registry = new AdapterRegistry();
      expect(registry.list()).toEqual([]);
    });
  });
});

describe("createDefaultAdapter", () => {
  it("should create a default adapter instance", () => {
    const adapter = createDefaultAdapter("/project", { projectName: "test" });
    expect(adapter).toBeInstanceOf(BundlerAdapter);
  });

  it("should throw when extract is called", () => {
    const adapter = createDefaultAdapter("/project", { projectName: "test" });
    expect(() => adapter.extract({})).toThrow(
      "Default adapter cannot extract - must be extended",
    );
  });
});
