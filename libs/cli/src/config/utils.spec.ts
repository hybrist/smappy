import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import {
  createTempDir,
  createCleanup,
  writeTempConfig,
  createTempConfigResult,
} from "./utils.js";

describe("config/utils", () => {
  let tempDirs: string[] = [];

  afterEach(async () => {
    // Clean up any temporary directories created during tests
    for (const dir of tempDirs) {
      if (existsSync(dir)) {
        await rm(dir, { recursive: true, force: true });
      }
    }
    tempDirs = [];
  });

  describe("createTempDir", () => {
    it("should create a temporary directory", async () => {
      const tempDir = await createTempDir("test");
      tempDirs.push(tempDir);

      expect(existsSync(tempDir)).toBe(true);
      expect(tempDir).toContain("test-");
    });

    it("should create directories with unique names", async () => {
      const dir1 = await createTempDir("test");
      const dir2 = await createTempDir("test");
      tempDirs.push(dir1, dir2);

      expect(dir1).not.toBe(dir2);
      expect(existsSync(dir1)).toBe(true);
      expect(existsSync(dir2)).toBe(true);
    });

    it("should use default prefix if none provided", async () => {
      const tempDir = await createTempDir();
      tempDirs.push(tempDir);

      expect(existsSync(tempDir)).toBe(true);
      expect(tempDir).toContain("smappy-");
    });
  });

  describe("createCleanup", () => {
    it("should create a cleanup function that removes the directory", async () => {
      const tempDir = await createTempDir("cleanup-test");
      tempDirs.push(tempDir);

      const cleanup = createCleanup(tempDir, false, false);
      await cleanup();

      expect(existsSync(tempDir)).toBe(false);
    });

    it("should not remove directory when keepTemp is true", async () => {
      const tempDir = await createTempDir("keep-test");
      tempDirs.push(tempDir);

      const cleanup = createCleanup(tempDir, true, false);
      await cleanup();

      expect(existsSync(tempDir)).toBe(true);
    });

    it("should only execute cleanup once", async () => {
      const tempDir = await createTempDir("once-test");
      tempDirs.push(tempDir);

      const cleanup = createCleanup(tempDir, false, false);
      await cleanup();
      expect(existsSync(tempDir)).toBe(false);

      // Second call should not throw
      await expect(cleanup()).resolves.not.toThrow();
    });
  });

  describe("writeTempConfig", () => {
    it("should write a config file to the temp directory", async () => {
      const tempDir = await createTempDir("write-test");
      tempDirs.push(tempDir);

      const content = "export default { test: true };";
      const configPath = await writeTempConfig(
        tempDir,
        "test.config.js",
        content,
        false,
      );

      expect(existsSync(configPath)).toBe(true);
      expect(configPath).toContain("test.config.js");
    });

    it("should write the correct content", async () => {
      const tempDir = await createTempDir("content-test");
      tempDirs.push(tempDir);

      const content = "// Test config\nexport default {};";
      const configPath = await writeTempConfig(
        tempDir,
        "config.js",
        content,
        false,
      );

      const { readFileSync } = await import("node:fs");
      const writtenContent = readFileSync(configPath, "utf-8");
      expect(writtenContent).toBe(content);
    });
  });

  describe("createTempConfigResult", () => {
    it("should create a valid TempConfigResult", async () => {
      const tempDir = await createTempDir("result-test");
      const configPath = `${tempDir}/test.config.js`;
      tempDirs.push(tempDir);

      const result = await createTempConfigResult(
        tempDir,
        configPath,
        false,
        false,
      );

      expect(result.tempDir).toBe(tempDir);
      expect(result.configPath).toBe(configPath);
      expect(typeof result.cleanup).toBe("function");
    });

    it("should cleanup temp dir when cleanup is called", async () => {
      const tempDir = await createTempDir("cleanup-result-test");
      const configPath = `${tempDir}/test.config.js`;
      tempDirs.push(tempDir);

      const result = await createTempConfigResult(
        tempDir,
        configPath,
        false,
        false,
      );

      await result.cleanup();
      expect(existsSync(tempDir)).toBe(false);
    });
  });
});
