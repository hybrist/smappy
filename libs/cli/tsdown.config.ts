import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [
    "src/main.ts",
    "src/plugins/angular/index.ts",
    "src/plugins/nextjs/index.ts",
    "src/plugins/vite/index.ts",
    "src/plugins/webpack/index.ts",
  ],
  sourcemap: true,
  tsconfig: "./tsconfig.json",
  exports: {
    devExports: true,
  },
});
