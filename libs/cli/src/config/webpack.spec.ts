import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { WebpackConfigGenerator } from "./webpack.ts";

describe("WebpackConfigGenerator", () => {
  let testDir: string;
  let tempDirs: string[] = [];
  const generator = new WebpackConfigGenerator();

  beforeEach(() => {
    testDir = join(tmpdir(), `webpack-config-test-${Date.now()}`);
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
    it("should support webpack bundler", () => {
      expect(generator.supports("webpack")).toBe(true);
    });

    it("should not support other bundlers", () => {
      expect(generator.supports("vite")).toBe(false);
      expect(generator.supports("nextjs")).toBe(false);
      expect(generator.supports("rollup")).toBe(false);
      expect(generator.supports(null)).toBe(false);
    });
  });

  describe("generate", () => {
    it("should generate a temporary config", async () => {
      const result = await generator.generate({
        projectPath: testDir,
        projectName: "test-project",
        bundler: "webpack",
        keepTemp: true,
        debug: false,
      });

      tempDirs.push(result.tempDir);

      expect(existsSync(result.configPath)).toBe(true);
      expect(result.configPath).toContain("webpack.config.temp.js");
      expect(result.tempDir).toContain("smappy-webpack-");
    });

    it("should generate minimal config when no user config exists", async () => {
      const result = await generator.generate({
        projectPath: testDir,
        projectName: "test-project",
        bundler: "webpack",
        keepTemp: true,
        debug: false,
      });

      tempDirs.push(result.tempDir);

      const { readFileSync } = await import("node:fs");
      const configContent = readFileSync(result.configPath, "utf-8");

      expect(configContent).toContain("webpackBundleAnalysisPlugin");
      expect(configContent).toContain("projectName: 'test-project'");
      expect(configContent).toContain("mode: 'production'");
    });

    it("should generate extending config when user config exists", async () => {
      // Create a user webpack config
      const userConfigPath = join(testDir, "webpack.config.js");
      writeFileSync(
        userConfigPath,
        `module.exports = {
  mode: 'production',
  entry: './src/index.js',
};`,
      );

      const result = await generator.generate({
        projectPath: testDir,
        projectName: "test-project",
        bundler: "webpack",
        keepTemp: true,
        debug: false,
      });

      tempDirs.push(result.tempDir);

      const { readFileSync } = await import("node:fs");
      const configContent = readFileSync(result.configPath, "utf-8");

      expect(configContent).toContain("require");
      expect(configContent).toContain("webpackBundleAnalysisPlugin");
      expect(configContent).toContain("projectName: 'test-project'");
    });

    it("should cleanup temporary files", async () => {
      const result = await generator.generate({
        projectPath: testDir,
        projectName: "test-project",
        bundler: "webpack",
        keepTemp: false,
        debug: false,
      });

      const tempDir = result.tempDir;
      expect(existsSync(tempDir)).toBe(true);

      await result.cleanup();
      expect(existsSync(tempDir)).toBe(false);
    });
  });
});
