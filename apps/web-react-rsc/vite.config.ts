import rsc from '@vitejs/plugin-rsc';
import react from '@vitejs/plugin-react';
import {
  defineConfig,
  type Plugin as VitePlugin,
  type ViteDevServer,
} from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';

// Global reference to RSC renderer for MCP handler
let rscRenderer: {
  renderGreeting: (props: { name: string }) => Promise<string>;
  dispatchAction: (
    actionId: string,
    encodedArgs: string,
  ) => Promise<{
    payload: string;
    returnValue: { ok: boolean; data: unknown };
  }>;
  renderComponent: (
    componentName: string,
    props: Record<string, unknown>,
  ) => Promise<string>;
} | null = null;

// Global reference to the MCP bootstrap HTML
let mcpBootstrapHtml: string | null = null;

// Export for use in handler
export function getRscRenderer() {
  return rscRenderer;
}

export function getMcpBootstrapHtml() {
  return mcpBootstrapHtml;
}

// Helper to convert Node.js IncomingMessage to Web Request
async function nodeToWebRequest(
  req: IncomingMessage,
  baseUrl: string,
): Promise<Request> {
  const url = new URL(req.url || '/', baseUrl);
  const headers = new Headers();

  for (const [key, value] of Object.entries(req.headers)) {
    if (value) {
      if (Array.isArray(value)) {
        value.forEach((v) => headers.append(key, v));
      } else {
        headers.set(key, value);
      }
    }
  }

  // Read body for methods that have one
  let body: string | undefined;
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    body = Buffer.concat(chunks).toString('utf8');
  }

  return new Request(url.toString(), {
    method: req.method || 'GET',
    headers,
    body,
  });
}

// Helper to send Web Response to Node.js ServerResponse
async function webToNodeResponse(
  webResponse: Response,
  res: ServerResponse,
): Promise<void> {
  res.statusCode = webResponse.status;

  webResponse.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  if (webResponse.body) {
    const reader = webResponse.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
  }

  res.end();
}

function rscMcpApps(): VitePlugin {
  let server: ViteDevServer;

  return {
    name: 'rsc-mcp-apps',

    configureServer: async (devServer) => {
      server = devServer;

      // Dynamically import handler to avoid circular dependency
      const { Route: mcpRoute } = await import('./src/mcp/handler.ts');

      function isSupportedMethod(
        method?: string,
      ): method is keyof typeof mcpRoute {
        if (!method) return false;
        return method in mcpRoute;
      }

      // Load RSC renderer module in RSC environment
      const loadRscRenderer = async () => {
        try {
          const rscEnv = server.environments['rsc'];
          if (!rscEnv) {
            console.error('RSC environment not found');
            return;
          }

          // Use the module runner to load the MCP RSC entry
          const mod = await (
            rscEnv as unknown as {
              runner: { import: (id: string) => Promise<unknown> };
            }
          ).runner.import('/src/mcp/entry.rsc.tsx');
          rscRenderer = mod as typeof rscRenderer;
          console.log('[MCP] RSC renderer loaded');
        } catch (error) {
          console.error('[MCP] Failed to load RSC renderer:', error);
        }
      };

      // Generate MCP bootstrap HTML
      const generateBootstrapHtml = async () => {
        const address = server.httpServer?.address();
        if (!address || typeof address === 'string') return;

        const port = address.port;
        const baseUrl = `http://localhost:${port}`;

        mcpBootstrapHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RSC MCP App</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      min-height: 100vh;
      background: var(--background, #ffffff);
      color: var(--foreground, #000000);
    }
    #root {
      padding: 1rem;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <!-- Vite client for HMR and React refresh preamble -->
  <script type="module" src="${baseUrl}/@vite/client"></script>
  <script type="module">
    // React refresh preamble - required for @vitejs/plugin-react in iframes
    import RefreshRuntime from "${baseUrl}/@react-refresh";
    RefreshRuntime.injectIntoGlobalHook(window);
    window.$RefreshReg$ = () => {};
    window.$RefreshSig$ = () => (type) => type;
    window.__vite_plugin_react_preamble_installed__ = true;
  </script>
  <script type="module" src="${baseUrl}/src/mcp/entry.client.tsx"></script>
</body>
</html>`;
      };

      // Initialize when server is ready
      server.httpServer?.once('listening', async () => {
        await loadRscRenderer();
        await generateBootstrapHtml();
      });

      // Handle HMR for RSC module
      server.watcher.on('change', async (file) => {
        if (
          file.includes('mcp/entry.rsc.tsx') ||
          file.includes('mcp/components/')
        ) {
          console.log('[MCP] Reloading RSC renderer...');
          await loadRscRenderer();
        }
      });

      // Serve test-host.html directly (bypass RSC)
      server.middlewares.use('/test-host', async (req, res, next) => {
        const fs = await import('node:fs/promises');
        const path = await import('node:path');
        const testHostPath = path.join(
          process.cwd(),
          'public',
          'test-host.html',
        );
        try {
          const html = await fs.readFile(testHostPath, 'utf-8');
          res.setHeader('Content-Type', 'text/html');
          res.end(html);
        } catch (error) {
          next();
        }
      });

      // MCP endpoint
      server.middlewares.use('/mcp', async (req, res, next) => {
        if (!isSupportedMethod(req.method)) {
          next();
          return;
        }

        try {
          const address = server.httpServer?.address();
          const port =
            typeof address === 'object' && address ? address.port : 5173;
          const baseUrl = `http://localhost:${port}`;

          const webRequest = await nodeToWebRequest(req, baseUrl);
          const webResponse = await mcpRoute[req.method]({
            request: webRequest,
          });
          await webToNodeResponse(webResponse, res);
        } catch (error) {
          console.error('[MCP] Error handling request:', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              jsonrpc: '2.0',
              error: { code: -32603, message: 'Internal server error' },
              id: null,
            }),
          );
        }
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
