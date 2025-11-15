/**
 * Tests for main detection orchestrator
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { detectBundlerAndFramework } from "./index.js";

describe("Detection Orchestrator", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = resolve(tmpdir(), `detection-orchestrator-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("Next.js + React detection", () => {
    it("should detect Next.js bundler and framework", async () => {
      writeFileSync(join(testDir, "next.config.js"), "module.exports = {}");
      writeFileSync(
        join(testDir, "package.json"),
        JSON.stringify({
          name: "test",
          dependencies: {
            next: "^15.0.0",
            react: "^18.0.0",
          },
        }),
      );

      const result = await detectBundlerAndFramework(testDir);
      expect(result.bundler).toBe("nextjs");
      expect(result.framework).toBe("nextjs");
      expect(result.confidence).toBe("high");
      expect(result.detectedVia.bundler.length).toBeGreaterThan(0);
      expect(result.detectedVia.framework.length).toBeGreaterThan(0);
    });
  });

  describe("Vite + React detection", () => {
    it("should detect Vite bundler and React framework", async () => {
      writeFileSync(join(testDir, "vite.config.js"), "export default {}");
      writeFileSync(
        join(testDir, "package.json"),
        JSON.stringify({
          name: "test",
          dependencies: {
            react: "^18.0.0",
            "react-dom": "^18.0.0",
          },
          devDependencies: {
            vite: "^7.0.0",
          },
        }),
      );

      const result = await detectBundlerAndFramework(testDir);
      expect(result.bundler).toBe("vite");
      expect(result.framework).toBe("react");
      expect(result.confidence).toBe("high");
    });
  });

  describe("SvelteKit + Vite detection", () => {
    it("should detect Vite bundler and SvelteKit framework", async () => {
      writeFileSync(join(testDir, "svelte.config.js"), "export default {}");
      writeFileSync(join(testDir, "vite.config.js"), "export default {}");
      writeFileSync(
        join(testDir, "package.json"),
        JSON.stringify({
          name: "test",
          dependencies: {
            "@sveltejs/kit": "^2.0.0",
            svelte: "^5.0.0",
          },
          devDependencies: {
            vite: "^7.0.0",
          },
        }),
      );

      const result = await detectBundlerAndFramework(testDir);
      expect(result.bundler).toBe("vite");
      expect(result.framework).toBe("sveltekit");
      expect(result.confidence).toBe("high");
    });
  });

  describe("Webpack + React detection", () => {
    it("should detect Webpack bundler and React framework", async () => {
      writeFileSync(join(testDir, "webpack.config.js"), "module.exports = {}");
      writeFileSync(
        join(testDir, "package.json"),
        JSON.stringify({
          name: "test",
          dependencies: {
            react: "^18.0.0",
            "react-dom": "^18.0.0",
          },
          devDependencies: {
            webpack: "^5.0.0",
          },
        }),
      );

      const result = await detectBundlerAndFramework(testDir);
      expect(result.bundler).toBe("webpack");
      expect(result.framework).toBe("react");
      expect(result.confidence).toBe("high");
    });
  });

  describe("Angular detection", () => {
    it("should detect Angular bundler and framework", async () => {
      writeFileSync(join(testDir, "angular.json"), "{}");
      writeFileSync(
        join(testDir, "package.json"),
        JSON.stringify({
          name: "test",
          dependencies: {
            "@angular/core": "^17.0.0",
          },
        }),
      );

      const result = await detectBundlerAndFramework(testDir);
      expect(result.bundler).toBe("angular");
      expect(result.framework).toBe("angular");
      expect(result.confidence).toBe("high");
    });
  });

  describe("Nuxt + Vite detection", () => {
    it("should detect Vite bundler and Nuxt framework", async () => {
      writeFileSync(join(testDir, "nuxt.config.js"), "export default {}");
      writeFileSync(
        join(testDir, "package.json"),
        JSON.stringify({
          name: "test",
          dependencies: {
            nuxt: "^3.0.0",
            vue: "^3.0.0",
          },
          devDependencies: {
            vite: "^7.0.0",
          },
        }),
      );

      const result = await detectBundlerAndFramework(testDir);
      expect(result.bundler).toBe("vite");
      expect(result.framework).toBe("nuxt");
      expect(result.confidence).toBe("high");
    });
  });

  describe("Error handling", () => {
    it("should throw error when package.json is missing", async () => {
      await expect(detectBundlerAndFramework(testDir)).rejects.toThrow(
        "package.json not found",
      );
    });

    it("should throw error when package.json is invalid", async () => {
      const invalidDir = resolve(tmpdir(), `invalid-json-test-${Date.now()}`);
      mkdirSync(invalidDir, { recursive: true });
      writeFileSync(join(invalidDir, "package.json"), "invalid json");

      await expect(detectBundlerAndFramework(invalidDir)).rejects.toThrow(
        "Failed to parse package.json",
      );

      // Cleanup
      if (existsSync(invalidDir)) {
        rmSync(invalidDir, { recursive: true, force: true });
      }
    });
  });

  describe("Confidence levels", () => {
    it("should have high confidence when both bundler and framework are high", async () => {
      writeFileSync(join(testDir, "vite.config.js"), "export default {}");
      writeFileSync(
        join(testDir, "package.json"),
        JSON.stringify({
          name: "test",
          dependencies: {
            react: "^18.0.0",
            "react-dom": "^18.0.0",
          },
          devDependencies: {
            vite: "^7.0.0",
          },
        }),
      );

      const result = await detectBundlerAndFramework(testDir);
      expect(result.confidence).toBe("high");
    });

    it("should have low confidence when both bundler and framework are low", async () => {
      writeFileSync(
        join(testDir, "package.json"),
        JSON.stringify({ name: "test" }),
      );

      const result = await detectBundlerAndFramework(testDir);
      expect(result.confidence).toBe("low");
    });
  });
});
