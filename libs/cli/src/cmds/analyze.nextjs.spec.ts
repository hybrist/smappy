import { describe, it, expect } from "vitest";

import { analyzeCommand } from "./analyze.ts";

import { Example } from "../../../../examples/testing.ts";

describe("smappy analyze examples/nextjs-app", () => {
  const nextjsApp = Example.fromName("nextjs-app");

  describe("analysis (webpack)", { timeout: 45_000 }, () => {
    it("saves to the db", async () => {
      const result = await analyzeCommand(nextjsApp.getPath(), {});
      expect(result).toBe(0);
    });
  });
});
