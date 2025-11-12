import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/main.ts"],
  sourcemap: true,
  tsconfig: "./tsconfig.json",
});
