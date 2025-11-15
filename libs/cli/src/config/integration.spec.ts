import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { generateTempConfig } from "./factory.ts";

describe("config/integration", () => {
  let testDir: string;
  let tempDirs: string[] = [];

  beforeEach(() => {
    testDir = join(tmpdir(), `config-integration-test-${Date.now()}`);
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

  describe("End-to-end config generation", () => {
    it("should generate config for Vite project with user config", async () => {
      // Create a mock project
      writeFileSync(
        join(testDir, "package.json"),
        JSON.stringify({ name: "test-vite-app", type: "module" }),
      );
      writeFileSync(
        join(testDir, "vite.config.ts"),
        `import { defineConfig } from 'vite';
export default defineConfig({
  base: '/app/',
  build: { outDir: 'build' },
});`,
      );

      const result = await generateTempConfig({
        projectPath: testDir,
        projectName: "test-vite-app",
        bundler: "vite",
        keepTemp: true,
        debug: false,
      });

      tempDirs.push(result.tempDir);

      // Verify config was generated
      expect(existsSync(result.configPath)).toBe(true);
      expect(result.configPath).toContain("vite.config.temp.ts");

      // Verify config content
      const { readFileSync } = await import("node:fs");
      const configContent = readFileSync(result.configPath, "utf-8");
      expect(configContent).toContain("viteBundleAnalysisPlugin");
      expect(configContent).toContain("test-vite-app");
      expect(configContent).toContain("mergeConfig");
    });

    it("should generate config for Webpack project", async () => {
      // Create a mock project
      writeFileSync(
        join(testDir, "package.json"),
        JSON.stringify({ name: "test-webpack-app" }),
      );
      writeFileSync(
        join(testDir, "webpack.config.js"),
        `module.exports = {
  entry: './src/index.js',
  mode: 'production',
};`,
      );

      const result = await generateTempConfig({
        projectPath: testDir,
        projectName: "test-webpack-app",
        bundler: "webpack",
        keepTemp: true,
        debug: false,
      });

      tempDirs.push(result.tempDir);

      // Verify config was generated
      expect(existsSync(result.configPath)).toBe(true);
      expect(result.configPath).toContain("webpack.config.temp.js");

      // Verify config content
      const { readFileSync } = await import("node:fs");
      const configContent = readFileSync(result.configPath, "utf-8");
      expect(configContent).toContain("webpackBundleAnalysisPlugin");
      expect(configContent).toContain("test-webpack-app");
    });

    it("should generate minimal config when user config doesn't exist", async () => {
      // Create a mock project without config
      writeFileSync(
        join(testDir, "package.json"),
        JSON.stringify({ name: "minimal-app", type: "module" }),
      );

      const result = await generateTempConfig({
        projectPath: testDir,
        projectName: "minimal-app",
        bundler: "vite",
        keepTemp: true,
        debug: false,
      });

      tempDirs.push(result.tempDir);

      // Verify config was generated
      expect(existsSync(result.configPath)).toBe(true);

      // Verify config content doesn't try to import user config
      const { readFileSync } = await import("node:fs");
      const configContent = readFileSync(result.configPath, "utf-8");
      expect(configContent).toContain("viteBundleAnalysisPlugin");
      expect(configContent).toContain("minimal-app");
      expect(configContent).not.toContain("import('/tmp/");
    });

    it("should cleanup temp files after analysis", async () => {
      writeFileSync(
        join(testDir, "package.json"),
        JSON.stringify({ name: "cleanup-test" }),
      );

      const result = await generateTempConfig({
        projectPath: testDir,
        projectName: "cleanup-test",
        bundler: "vite",
        keepTemp: false,
        debug: false,
      });

      const tempDir = result.tempDir;
      expect(existsSync(tempDir)).toBe(true);

      // Cleanup should remove the directory
      await result.cleanup();
      expect(existsSync(tempDir)).toBe(false);
    });

    it("should handle Next.js projects", async () => {
      writeFileSync(
        join(testDir, "package.json"),
        JSON.stringify({ name: "test-nextjs-app" }),
      );
      writeFileSync(
        join(testDir, "next.config.js"),
        `module.exports = { reactStrictMode: true };`,
      );

      const result = await generateTempConfig({
        projectPath: testDir,
        projectName: "test-nextjs-app",
        bundler: "nextjs",
        keepTemp: true,
        debug: false,
      });

      tempDirs.push(result.tempDir);

      expect(existsSync(result.configPath)).toBe(true);
      expect(result.configPath).toContain("next.config.temp.js");

      const { readFileSync } = await import("node:fs");
      const configContent = readFileSync(result.configPath, "utf-8");
      expect(configContent).toContain("nextjsBundleAnalysisPlugin");
      expect(configContent).toContain("webpack:");
    });
  });

  describe("Error handling", () => {
    it("should throw error for unsupported bundler", async () => {
      await expect(
        generateTempConfig({
          projectPath: testDir,
          projectName: "test",
          bundler: "unsupported" as any,
        }),
      ).rejects.toThrow("No config generator available");
    });

    it("should handle missing project directory gracefully", async () => {
      const nonExistentDir = join(tmpdir(), "non-existent-dir");

      // Should still generate config (directory check is done by analyze command)
      const result = await generateTempConfig({
        projectPath: nonExistentDir,
        projectName: "test",
        bundler: "vite",
        keepTemp: true,
      });

      tempDirs.push(result.tempDir);
      expect(existsSync(result.configPath)).toBe(true);
    });
  });
});
