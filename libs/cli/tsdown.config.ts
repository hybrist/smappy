import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/main.ts", "src/webpack/plugin.ts"],
  sourcemap: true,
  tsconfig: "./tsconfig.json",
  exports: {
    devExports: true,
  },
});
