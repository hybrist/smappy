import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      // TODO: Make the app tests not depend on a specific cwd.
      // "apps/*",
      "libs/*",
    ],
  },
});
