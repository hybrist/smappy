/**
 * Tests for Vite adapter
 */
import { describe, it, expect } from "vitest";
import { ViteAdapter } from "./adapter.ts";
import type { BundlerPluginOptions } from "../types.ts";
import type { OutputBundle, OutputChunk } from "rollup";

describe("ViteAdapter", () => {
  const baseDir = "/project";
  const options: BundlerPluginOptions = {
    projectName: "test-project",
  };

  describe("extract", () => {
    it("should return empty result for invalid input", () => {
      const adapter = new ViteAdapter(baseDir, options);
      const result = adapter.extract(null);

      expect(result.bundles).toEqual([]);
      expect(result.modules).toEqual([]);
      expect(result.chunks).toEqual([]);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should extract bundles from Rollup output", () => {
      const adapter = new ViteAdapter(baseDir, options);

      // Create a mock Rollup bundle
      const mockBundle: OutputBundle = {
        "main.js": {
          type: "chunk",
          fileName: "main.js",
          name: "main",
          code: 'console.log("hello");',
          isEntry: true,
          isDynamicEntry: false,
          imports: [],
          dynamicImports: [],
          facadeModuleId: "src/main.js",
          isImported: false,
          modules: {
            "src/main.js": {
              renderedLength: 25,
            },
          },
        } as unknown as OutputChunk,
      };

      const rollupOutput = {
        bundle: mockBundle,
        outputDir: "/project/dist",
        isSSR: false,
      };

      const result = adapter.extract(rollupOutput);

      expect(result.bundles).toHaveLength(1);
      expect(result.bundles[0].fileName).toBe("main.js");
      expect(result.bundles[0].content).toBe('console.log("hello");');
      expect(result.errors).toEqual([]);
    });

    it("should extract modules from Rollup output", () => {
      const adapter = new ViteAdapter(baseDir, options);

      const mockBundle: OutputBundle = {
        "main.js": {
          type: "chunk",
          fileName: "main.js",
          name: "main",
          code: 'console.log("hello");',
          isEntry: true,
          isDynamicEntry: false,
          imports: ["src/utils.js"],
          dynamicImports: [],
          facadeModuleId: "src/main.js",
          isImported: false,
          modules: {
            "src/main.js": {
              renderedLength: 25,
            },
            "src/utils.js": {
              renderedLength: 15,
            },
          },
        } as unknown as OutputChunk,
      };

      const rollupOutput = {
        bundle: mockBundle,
        outputDir: "/project/dist",
        isSSR: false,
      };

      const result = adapter.extract(rollupOutput);

      expect(result.modules.length).toBeGreaterThan(0);
      // Should include entry module
      const entryModule = result.modules.find((m) =>
        m.filePath.includes("main.js"),
      );
      expect(entryModule).toBeDefined();
    });

    it("should extract chunks from Rollup output", () => {
      const adapter = new ViteAdapter(baseDir, options);

      const mockBundle: OutputBundle = {
        "main.js": {
          type: "chunk",
          fileName: "main.js",
          name: "main",
          code: 'console.log("hello");',
          isEntry: true,
          isDynamicEntry: false,
          imports: [],
          dynamicImports: [],
          facadeModuleId: "src/main.js",
          isImported: false,
          modules: {
            "src/main.js": {
              renderedLength: 25,
            },
          },
        } as unknown as OutputChunk,
        "vendor.js": {
          type: "chunk",
          fileName: "vendor.js",
          name: "vendor",
          code: "/* vendor code */",
          isEntry: false,
          isDynamicEntry: true,
          imports: [],
          dynamicImports: [],
          isImported: false,
          modules: {
            "node_modules/react/index.js": {
              renderedLength: 100,
            },
          },
        } as unknown as OutputChunk,
      };

      const rollupOutput = {
        bundle: mockBundle,
        outputDir: "/project/dist",
        isSSR: false,
      };

      const result = adapter.extract(rollupOutput);

      expect(result.chunks).toHaveLength(2);
      const mainChunk = result.chunks.find((c) => c.name === "main");
      expect(mainChunk).toBeDefined();
      expect(mainChunk?.isEntry).toBe(true);
      expect(mainChunk?.isAsync).toBe(false);

      const vendorChunk = result.chunks.find((c) => c.name === "vendor");
      expect(vendorChunk).toBeDefined();
      expect(vendorChunk?.isEntry).toBe(false);
      expect(vendorChunk?.isAsync).toBe(true);
    });

    it("should handle SSR builds", () => {
      const adapter = new ViteAdapter(baseDir, options);

      const mockBundle: OutputBundle = {
        "server.js": {
          type: "chunk",
          fileName: "server.js",
          name: "server",
          code: "export {};",
          isEntry: true,
          isDynamicEntry: false,
          imports: [],
          dynamicImports: [],
          facadeModuleId: "src/server.js",
          isImported: false,
          modules: {},
        } as unknown as OutputChunk,
      };

      const rollupOutput = {
        bundle: mockBundle,
        outputDir: "/project/dist",
        isSSR: true,
      };

      const result = adapter.extract(rollupOutput);

      expect(result.bundles).toHaveLength(1);
      expect(result.options.bundlerType).toBe("vite");
    });

    it("should skip third-party modules when configured", () => {
      const adapter = new ViteAdapter(baseDir, {
        ...options,
        analyzeThirdParty: false,
      });

      const mockBundle: OutputBundle = {
        "main.js": {
          type: "chunk",
          fileName: "main.js",
          name: "main",
          code: 'console.log("hello");',
          isEntry: true,
          isDynamicEntry: false,
          imports: [],
          dynamicImports: [],
          facadeModuleId: "src/main.js",
          isImported: false,
          modules: {
            "src/main.js": {
              renderedLength: 25,
            },
            "node_modules/react/index.js": {
              renderedLength: 100,
            },
          },
        } as unknown as OutputChunk,
      };

      const rollupOutput = {
        bundle: mockBundle,
        outputDir: "/project/dist",
        isSSR: false,
      };

      const result = adapter.extract(rollupOutput);

      // Should not include node_modules modules
      const hasNodeModules = result.modules.some((m) =>
        m.filePath.includes("node_modules"),
      );
      expect(hasNodeModules).toBe(false);
    });

    it("should include third-party modules when configured", () => {
      const adapter = new ViteAdapter(baseDir, {
        ...options,
        analyzeThirdParty: true,
      });

      const mockBundle: OutputBundle = {
        "main.js": {
          type: "chunk",
          fileName: "main.js",
          name: "main",
          code: 'console.log("hello");',
          isEntry: true,
          isDynamicEntry: false,
          imports: [],
          dynamicImports: [],
          facadeModuleId: "src/main.js",
          isImported: false,
          modules: {
            "src/main.js": {
              renderedLength: 25,
            },
            "node_modules/react/index.js": {
              renderedLength: 100,
            },
          },
        } as unknown as OutputChunk,
      };

      const rollupOutput = {
        bundle: mockBundle,
        outputDir: "/project/dist",
        isSSR: false,
      };

      const result = adapter.extract(rollupOutput);

      // Should include node_modules modules
      const hasNodeModules = result.modules.some((m) =>
        m.filePath.includes("node_modules"),
      );
      expect(hasNodeModules).toBe(true);
    });

    it("should apply exclude patterns", () => {
      const adapter = new ViteAdapter(baseDir, {
        ...options,
        excludePatterns: ["**/test/**"],
      });

      const mockBundle: OutputBundle = {
        "main.js": {
          type: "chunk",
          fileName: "main.js",
          name: "main",
          code: 'console.log("hello");',
          isEntry: true,
          isDynamicEntry: false,
          imports: [],
          dynamicImports: [],
          facadeModuleId: "src/main.js",
          isImported: false,
          modules: {
            "src/main.js": {
              renderedLength: 25,
            },
            "src/test/utils.js": {
              renderedLength: 15,
            },
          },
        } as unknown as OutputChunk,
      };

      const rollupOutput = {
        bundle: mockBundle,
        outputDir: "/project/dist",
        isSSR: false,
      };

      const result = adapter.extract(rollupOutput);

      // Should exclude test files
      const hasTestFile = result.modules.some((m) =>
        m.filePath.includes("test"),
      );
      expect(hasTestFile).toBe(false);
    });

    it("should handle bundles without source maps", () => {
      const adapter = new ViteAdapter(baseDir, {
        ...options,
        extractSourceMaps: true,
      });

      const mockBundle: OutputBundle = {
        "main.js": {
          type: "chunk",
          fileName: "main.js",
          name: "main",
          code: 'console.log("hello");',
          isEntry: true,
          isDynamicEntry: false,
          imports: [],
          dynamicImports: [],
          facadeModuleId: "src/main.js",
          isImported: false,
          modules: {},
        } as unknown as OutputChunk,
      };

      const rollupOutput = {
        bundle: mockBundle,
        outputDir: "/project/dist",
        isSSR: false,
      };

      const result = adapter.extract(rollupOutput);

      expect(result.bundles).toHaveLength(1);
      // Source map should be undefined if not available
      expect(result.bundles[0].sourceMapReference).toBeUndefined();
    });

    it("should handle errors gracefully", () => {
      const adapter = new ViteAdapter(baseDir, options);

      // Pass invalid bundle structure
      const invalidOutput = {
        bundle: null,
        outputDir: "/project/dist",
      };

      const result = adapter.extract(invalidOutput);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.bundles).toEqual([]);
      expect(result.modules).toEqual([]);
      expect(result.chunks).toEqual([]);
    });
  });
});
