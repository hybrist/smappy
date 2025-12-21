import rsc from '@vitejs/plugin-rsc';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin as VitePlugin } from 'vite';
import { Route as mcpRoute } from './src/mcp/handler.ts';
import { createServerAdapter } from '@whatwg-node/server';

function isSupportedMethod(method?: string): method is keyof typeof mcpRoute {
  if (!method) return false;
  return method in mcpRoute;
}

function rscMcpApps(): VitePlugin {
  return {
    name: 'rsc-mcp-apps',
    configureServer: async (server) => {
      const handlers = {
        POST: createServerAdapter(async (request) => {
          return mcpRoute.POST({ request });
        }),
        DELETE: createServerAdapter(async (request) => {
          return mcpRoute.DELETE({ request });
        }),
      };
      server.middlewares.use('/mcp', async (req, res, next) => {
        const handler = isSupportedMethod(req.method)
          ? handlers[req.method]
          : undefined;
        if (!handler) {
          next();
          return;
        }

        await handler(req, res);

        // try {
        //   // Get the server's address to make an internal request
        //   const address = server.httpServer?.address();
        //   if (!address || typeof address === 'string') {
        //     throw new Error('Unable to determine server address');
        //   }

        //   const port = address.port;
        //   const baseUrl = `http://localhost:${port}`;

        //   // Use an arbitrary URL for rendering the Root component
        //   const url = new URL('/', baseUrl);

        //   // Make an internal request to the dev server to trigger normal RSC/SSR rendering
        //   // This ensures the request goes through the proper RSC handler pipeline
        //   // which will render the Root component and return HTML
        //   const response = await fetch(url.toString(), {
        //     method: 'GET',
        //   });

        //   if (!response.ok) {
        //     throw new Error(
        //       `Failed to render: ${response.status} ${response.statusText}`,
        //     );
        //   }

        //   // Extract HTML from the response
        //   const html = await response.text();

        //   res.setHeader('Content-Type', 'application/json;charset=utf-8');
        //   res.end(
        //     JSON.stringify({
        //       ok: true,
        //       content: html,
        //     }),
        //   );
        // } catch (error) {
        //   console.error('Error rendering React component:', error);
        //   res.statusCode = 500;
        //   res.setHeader('Content-Type', 'application/json;charset=utf-8');
        //   res.end(
        //     JSON.stringify({
        //       ok: false,
        //       error: error instanceof Error ? error.message : String(error),
        //     }),
        //   );
        // }
      });
    },
  };
}

export default defineConfig({
  plugins: [
    rsc({
      // `entries` option is only a shorthand for specifying each `rollupOptions.input` below
      // > entries: { rsc, ssr, client },
      //
      // by default, the plugin setup request handler based on `default export` of `rsc` environment `rollupOptions.input.index`.
      // This can be disabled when setting up own server handler e.g. `@cloudflare/vite-plugin`.
      // > serverHandler: false
    }),

    // use any of react plugins https://github.com/vitejs/vite-plugin-react
    // to enable client component HMR
    react(),

    rscMcpApps(),

    // use https://github.com/antfu-collective/vite-plugin-inspect
    // to understand internal transforms required for RSC.
    // import("vite-plugin-inspect").then(m => m.default()),
  ],

  // specify entry point for each environment.
  // (currently the plugin assumes `rollupOptions.input.index` for some features.)
  environments: {
    // `rsc` environment loads modules with `react-server` condition.
    // this environment is responsible for:
    // - RSC stream serialization (React VDOM -> RSC stream)
    // - server functions handling
    rsc: {
      build: {
        rollupOptions: {
          input: {
            index: './src/framework/entry.rsc.tsx',
          },
        },
      },
    },

    // `ssr` environment loads modules without `react-server` condition.
    // this environment is responsible for:
    // - RSC stream deserialization (RSC stream -> React VDOM)
    // - traditional SSR (React VDOM -> HTML string/stream)
    ssr: {
      build: {
        rollupOptions: {
          input: {
            index: './src/framework/entry.ssr.tsx',
          },
        },
      },
    },

    // client environment is used for hydration and client-side rendering
    // this environment is responsible for:
    // - RSC stream deserialization (RSC stream -> React VDOM)
    // - traditional CSR (React VDOM -> Browser DOM tree mount/hydration)
    // - refetch and re-render RSC
    // - calling server functions
    client: {
      build: {
        rollupOptions: {
          input: {
            index: './src/framework/entry.browser.tsx',
          },
        },
      },
    },
  },
});
