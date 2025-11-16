import { describe, it, expect } from "vitest";

import { analyzeCommand } from "./analyze.ts";

import { Example } from "../../../../examples/testing.ts";

describe("smappy analyze examples/webpack-app", () => {
  const webpackApp = Example.fromName("webpack-app");

  describe("analysis", { timeout: 30_000 }, () => {
    it("saves to the db", async () => {
      const result = await analyzeCommand(webpackApp.getPath(), {});
      expect(result).toBe(0);
    });
  });
});
