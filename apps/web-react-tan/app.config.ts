/**
 * TanStack Start Configuration
 *
 * This replaces the Vite configuration when using TanStack Start.
 * TanStack Start uses Vinxi as its bundler.
 */

import { defineConfig } from "@tanstack/start/config";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  vite: {
    plugins: [tsConfigPaths()],
  },
  server: {
    preset: "node-server",
  },
});
