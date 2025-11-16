import { describe, it, expect } from "vitest";

describe("smappy-cli", () => {
  it("should export main program", async () => {
    // Basic smoke test - verify the module can be imported
    await expect(import("@smappy/cli/main")).resolves.toBeDefined();
  });
});
