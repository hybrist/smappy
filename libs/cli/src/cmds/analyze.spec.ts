import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { analyzeCommand } from "./analyze.js";

// Mock console methods to test output
let consoleLogSpy: ReturnType<typeof vi.spyOn>;
let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

describe("analyzeCommand", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `smappy-analyze-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it("should analyze a valid project directory", async () => {
    writeFileSync(
      join(testDir, "package.json"),
      JSON.stringify({
        name: "test-project",
        dependencies: { react: "^18.0.0" },
      }),
    );
    writeFileSync(join(testDir, "vite.config.js"), "");

    await analyzeCommand(testDir, { verbose: false });

    expect(consoleLogSpy).toHaveBeenCalledWith(
      "Detecting project configuration...",
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Project analysis complete"),
    );
  });

  it("should show verbose output when enabled", async () => {
    writeFileSync(
      join(testDir, "package.json"),
      JSON.stringify({
        name: "test-project",
        dependencies: { react: "^18.0.0" },
      }),
    );
    writeFileSync(join(testDir, "vite.config.js"), "");

    await analyzeCommand(testDir, { verbose: true });

    // Check that verbose messages were logged
    const logCalls = consoleLogSpy.mock.calls.flat();
    const logMessages = logCalls.join(" ");

    expect(logMessages).toContain("Analyzing project at:");
    expect(logMessages).toContain("Bundler:");
    expect(logMessages).toContain("Framework:");
  });

  it("should throw error for non-existent directory", async () => {
    const nonExistentPath = join(testDir, "does-not-exist");

    await expect(analyzeCommand(nonExistentPath)).rejects.toThrow(
      "Project path does not exist",
    );
  });

  it("should warn when bundler is unknown", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    writeFileSync(
      join(testDir, "package.json"),
      JSON.stringify({ name: "test-project" }),
    );

    await analyzeCommand(testDir);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Could not detect bundler"),
    );

    consoleErrorSpy.mockRestore();
  });

  it("should use current working directory as default", async () => {
    const originalCwd = process.cwd();

    try {
      process.chdir(testDir);

      writeFileSync(
        join(testDir, "package.json"),
        JSON.stringify({
          name: "test-project",
          dependencies: { next: "^14.0.0" },
        }),
      );

      await analyzeCommand();

      expect(consoleLogSpy).toHaveBeenCalled();
    } finally {
      process.chdir(originalCwd);
    }
  });
});
