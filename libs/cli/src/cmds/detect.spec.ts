import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  detectBundler,
  detectFramework,
  hasTypeScript,
  getProjectName,
  detectProject,
} from "./detect.js";

describe("detect", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `smappy-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("detectBundler", () => {
    it("should detect webpack from config file", () => {
      writeFileSync(join(testDir, "webpack.config.js"), "");
      writeFileSync(
        join(testDir, "package.json"),
        JSON.stringify({ name: "test" }),
      );

      expect(detectBundler(testDir)).toBe("webpack");
    });

    it("should detect vite from config file", () => {
      writeFileSync(join(testDir, "vite.config.js"), "");
      writeFileSync(
        join(testDir, "package.json"),
        JSON.stringify({ name: "test" }),
      );

      expect(detectBundler(testDir)).toBe("vite");
    });

    it("should detect nextjs from config file", () => {
      writeFileSync(join(testDir, "next.config.js"), "");
      writeFileSync(
        join(testDir, "package.json"),
        JSON.stringify({ name: "test" }),
      );

      expect(detectBundler(testDir)).toBe("nextjs");
    });

    it("should detect angular from angular.json", () => {
      writeFileSync(join(testDir, "angular.json"), "");
      writeFileSync(
        join(testDir, "package.json"),
        JSON.stringify({ name: "test" }),
      );

      expect(detectBundler(testDir)).toBe("angular");
    });

    it("should detect bundler from package.json dependencies", () => {
      writeFileSync(
        join(testDir, "package.json"),
        JSON.stringify({
          name: "test",
          dependencies: { next: "^14.0.0" },
        }),
      );

      expect(detectBundler(testDir)).toBe("nextjs");
    });

    it("should return unknown for missing package.json", () => {
      expect(detectBundler(testDir)).toBe("unknown");
    });

    it("should return unknown for invalid package.json", () => {
      writeFileSync(join(testDir, "package.json"), "invalid json");
      expect(detectBundler(testDir)).toBe("unknown");
    });
  });

  describe("detectFramework", () => {
    it("should detect react", () => {
      writeFileSync(
        join(testDir, "package.json"),
        JSON.stringify({
          name: "test",
          dependencies: { react: "^18.0.0" },
        }),
      );

      expect(detectFramework(testDir)).toBe("react");
    });

    it("should detect vue", () => {
      writeFileSync(
        join(testDir, "package.json"),
        JSON.stringify({
          name: "test",
          dependencies: { vue: "^3.0.0" },
        }),
      );

      expect(detectFramework(testDir)).toBe("vue");
    });

    it("should detect svelte", () => {
      writeFileSync(
        join(testDir, "package.json"),
        JSON.stringify({
          name: "test",
          dependencies: { svelte: "^4.0.0" },
        }),
      );

      expect(detectFramework(testDir)).toBe("svelte");
    });

    it("should detect nextjs", () => {
      writeFileSync(
        join(testDir, "package.json"),
        JSON.stringify({
          name: "test",
          dependencies: { next: "^14.0.0" },
        }),
      );

      expect(detectFramework(testDir)).toBe("nextjs");
    });

    it("should detect angular", () => {
      writeFileSync(
        join(testDir, "package.json"),
        JSON.stringify({
          name: "test",
          dependencies: { "@angular/core": "^17.0.0" },
        }),
      );

      expect(detectFramework(testDir)).toBe("angular");
    });

    it("should return unknown for missing package.json", () => {
      expect(detectFramework(testDir)).toBe("unknown");
    });
  });

  describe("hasTypeScript", () => {
    it("should return true if tsconfig.json exists", () => {
      writeFileSync(join(testDir, "tsconfig.json"), "{}");
      expect(hasTypeScript(testDir)).toBe(true);
    });

    it("should return true if typescript is in dependencies", () => {
      writeFileSync(
        join(testDir, "package.json"),
        JSON.stringify({
          name: "test",
          devDependencies: { typescript: "^5.0.0" },
        }),
      );

      expect(hasTypeScript(testDir)).toBe(true);
    });

    it("should return false if no TypeScript indicators", () => {
      writeFileSync(
        join(testDir, "package.json"),
        JSON.stringify({ name: "test" }),
      );

      expect(hasTypeScript(testDir)).toBe(false);
    });
  });

  describe("getProjectName", () => {
    it("should return project name from package.json", () => {
      writeFileSync(
        join(testDir, "package.json"),
        JSON.stringify({ name: "my-project" }),
      );

      expect(getProjectName(testDir)).toBe("my-project");
    });

    it("should return unknown for missing package.json", () => {
      expect(getProjectName(testDir)).toBe("unknown");
    });

    it("should return unknown if name is missing", () => {
      writeFileSync(
        join(testDir, "package.json"),
        JSON.stringify({ version: "1.0.0" }),
      );

      expect(getProjectName(testDir)).toBe("unknown");
    });
  });

  describe("detectProject", () => {
    it("should detect complete project information", () => {
      writeFileSync(join(testDir, "vite.config.js"), "");
      writeFileSync(join(testDir, "tsconfig.json"), "{}");
      writeFileSync(
        join(testDir, "package.json"),
        JSON.stringify({
          name: "my-project",
          dependencies: { react: "^18.0.0" },
        }),
      );

      const info = detectProject(testDir);

      expect(info.bundler).toBe("vite");
      expect(info.framework).toBe("react");
      expect(info.hasTypeScript).toBe(true);
      expect(info.projectName).toBe("my-project");
    });
  });
});

