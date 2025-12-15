import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/file-summary/mcp-app.tsx"],
  sourcemap: true,
  tsconfig: "./tsconfig.json",
  exports: {
    devExports: true,
  },
});
