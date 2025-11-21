import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
// import { tanstackStart } from "@tanstack/react-start/plugin/vite";

/**
 * TODO: Enable TanStack Start SSR
 *
 * TanStack Start requires a complete SSR setup that is currently not configured.
 * To enable server functions properly:
 *
 * 1. Convert to file-based routing:
 *    - Each route file must export a `Route` const using createFileRoute()
 *    - Remove programmatic routing from router.tsx
 *    - See: https://tanstack.com/router/latest/docs/framework/react/guide/file-based-routing
 *
 * 2. Set up SSR entry points:
 *    - Add server entry point (typically src/entry-server.tsx)
 *    - Configure separate client and server builds
 *    - See: https://tanstack.com/start/latest/docs/framework/react/build-from-scratch
 *
 * 3. Re-enable the tanstackStart plugin:
 *    - Uncomment the import and plugin usage below
 *    - Configure plugin order: tsconfigPaths(), tanstackStart(), tailwindcss(), react()
 *
 * 4. Server functions in src/api/index.ts will then work properly
 *
 * Current state: Client-only build, server functions are stubs
 */

export default defineConfig({
  plugins: [tsconfigPaths(), tailwindcss(), react()],
  server: {
    port: 3000,
  },
  build: {
    outDir: "dist",
  },
});
