import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ViteConfigGenerator } from "./vite.js";

describe("ViteConfigGenerator", () => {
  let testDir: string;
  let tempDirs: string[] = [];
  const generator = new ViteConfigGenerator();

  beforeEach(() => {
    testDir = join(tmpdir(), `vite-config-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Cleanup test directory
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true });
    }

    // Cleanup any generated temp directories
    for (const dir of tempDirs) {
      if (existsSync(dir)) {
        await rm(dir, { recursive: true, force: true });
      }
    }
    tempDirs = [];
  });

  describe("supports", () => {
    it("should support vite bundler", () => {
      expect(generator.supports("vite")).toBe(true);
    });

    it("should not support other bundlers", () => {
      expect(generator.supports("webpack")).toBe(false);
      expect(generator.supports("nextjs")).toBe(false);
      expect(generator.supports("rollup")).toBe(false);
      expect(generator.supports("angular")).toBe(false);
      expect(generator.supports(null)).toBe(false);
    });
  });

  describe("generate", () => {
    it("should generate a temporary config", async () => {
      const result = await generator.generate({
        projectPath: testDir,
        projectName: "test-project",
        bundler: "vite",
        keepTemp: true,
        debug: false,
      });

      tempDirs.push(result.tempDir);

      expect(existsSync(result.configPath)).toBe(true);
      expect(result.configPath).toContain("vite.config.temp.ts");
      expect(result.tempDir).toContain("smappy-vite-");
      expect(typeof result.cleanup).toBe("function");
    });

    it("should generate minimal config when no user config exists", async () => {
      const result = await generator.generate({
        projectPath: testDir,
        projectName: "test-project",
        bundler: "vite",
        keepTemp: true,
        debug: false,
      });

      tempDirs.push(result.tempDir);

      const { readFileSync } = await import("node:fs");
      const configContent = readFileSync(result.configPath, "utf-8");

      expect(configContent).toContain("import { defineConfig } from 'vite'");
      expect(configContent).toContain("viteBundleAnalysisPlugin");
      expect(configContent).toContain("projectName: 'test-project'");
      expect(configContent).toContain("autoIngest: true");
    });

    it("should generate extending config when user config exists", async () => {
      // Create a user vite config
      const userConfigPath = join(testDir, "vite.config.ts");
      writeFileSync(
        userConfigPath,
        `import { defineConfig } from 'vite';
export default defineConfig({
  base: '/my-app/',
  plugins: [],
});`,
      );

      const result = await generator.generate({
        projectPath: testDir,
        projectName: "test-project",
        bundler: "vite",
        keepTemp: true,
        debug: false,
      });

      tempDirs.push(result.tempDir);

      const { readFileSync } = await import("node:fs");
      const configContent = readFileSync(result.configPath, "utf-8");

      expect(configContent).toContain("import");
      expect(configContent).toContain("mergeConfig");
      expect(configContent).toContain("viteBundleAnalysisPlugin");
      expect(configContent).toContain("projectName: 'test-project'");
      expect(configContent).toContain("defineConfig(async ()");
    });

    it("should cleanup temporary files", async () => {
      const result = await generator.generate({
        projectPath: testDir,
        projectName: "test-project",
        bundler: "vite",
        keepTemp: false,
        debug: false,
      });

      const tempDir = result.tempDir;
      expect(existsSync(tempDir)).toBe(true);

      await result.cleanup();
      expect(existsSync(tempDir)).toBe(false);
    });

    it("should respect keepTemp flag", async () => {
      const result = await generator.generate({
        projectPath: testDir,
        projectName: "test-project",
        bundler: "vite",
        keepTemp: true,
        debug: false,
      });

      tempDirs.push(result.tempDir);

      const tempDir = result.tempDir;
      expect(existsSync(tempDir)).toBe(true);

      await result.cleanup();
      // Should still exist when keepTemp is true
      expect(existsSync(tempDir)).toBe(true);
    });

    it("should include debug flag in config", async () => {
      const result = await generator.generate({
        projectPath: testDir,
        projectName: "test-project",
        bundler: "vite",
        keepTemp: true,
        debug: true,
      });

      tempDirs.push(result.tempDir);

      const { readFileSync } = await import("node:fs");
      const configContent = readFileSync(result.configPath, "utf-8");

      expect(configContent).toContain("debug: true");
    });
  });
});
