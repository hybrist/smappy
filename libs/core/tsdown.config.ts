import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/ast/index.ts",
    "src/graph/index.ts",
    "src/size/index.ts",
    "src/source-map/index.ts",
  ],
  format: "esm",
  dts: false,
  sourcemap: true,
  tsconfig: "./tsconfig.json",
  exports: {
    devExports: true,
  },
});
