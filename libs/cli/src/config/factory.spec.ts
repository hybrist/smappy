import { describe, it, expect } from "vitest";
import {
  getConfigGenerator,
  isBundlerSupported,
  generateTempConfig,
} from "./factory.ts";
import { ViteConfigGenerator } from "./vite.ts";
import { WebpackConfigGenerator } from "./webpack.ts";
import { NextjsConfigGenerator } from "./nextjs.ts";
import { RollupConfigGenerator } from "./rollup.ts";

describe("config/factory", () => {
  describe("getConfigGenerator", () => {
    it("should return ViteConfigGenerator for vite", () => {
      const generator = getConfigGenerator("vite");
      expect(generator).toBeInstanceOf(ViteConfigGenerator);
    });

    it("should return WebpackConfigGenerator for webpack", () => {
      const generator = getConfigGenerator("webpack");
      expect(generator).toBeInstanceOf(WebpackConfigGenerator);
    });

    it("should return NextjsConfigGenerator for nextjs", () => {
      const generator = getConfigGenerator("nextjs");
      expect(generator).toBeInstanceOf(NextjsConfigGenerator);
    });

    it("should return RollupConfigGenerator for rollup", () => {
      const generator = getConfigGenerator("rollup");
      expect(generator).toBeInstanceOf(RollupConfigGenerator);
    });

    it("should return null for unsupported bundlers", () => {
      expect(getConfigGenerator("esbuild")).toBeNull();
      expect(getConfigGenerator("parcel")).toBeNull();
      expect(getConfigGenerator("angular")).toBeNull();
      expect(getConfigGenerator(null)).toBeNull();
    });
  });

  describe("isBundlerSupported", () => {
    it("should return true for supported bundlers", () => {
      expect(isBundlerSupported("vite")).toBe(true);
      expect(isBundlerSupported("webpack")).toBe(true);
      expect(isBundlerSupported("nextjs")).toBe(true);
      expect(isBundlerSupported("rollup")).toBe(true);
    });

    it("should return false for unsupported bundlers", () => {
      expect(isBundlerSupported("esbuild")).toBe(false);
      expect(isBundlerSupported("parcel")).toBe(false);
      expect(isBundlerSupported("angular")).toBe(false);
      expect(isBundlerSupported(null)).toBe(false);
    });
  });

  describe("generateTempConfig", () => {
    it("should throw error for unsupported bundler", async () => {
      await expect(
        generateTempConfig({
          projectPath: "/test/path",
          projectName: "test",
          bundler: "esbuild",
        }),
      ).rejects.toThrow("No config generator available for bundler: esbuild");
    });

    it("should throw error for null bundler", async () => {
      await expect(
        generateTempConfig({
          projectPath: "/test/path",
          projectName: "test",
          bundler: null,
        }),
      ).rejects.toThrow("No config generator available for bundler: null");
    });
  });
});
