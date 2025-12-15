import { createFileRoute } from "@tanstack/react-router";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

// Session storage: maps session IDs to connected client/server pairs
const sessions = new Map<
  string,
  { client: Client; cleanup: () => Promise<void> }
>();

// Hello World MCP App HTML
const helloAppHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      padding: 1rem;
      min-height: 100vh;
      background: var(--background, #ffffff);
      color: var(--foreground, #000000);
    }
    .container {
      max-width: 400px;
      margin: 0 auto;
      text-align: center;
    }
    h1 { margin-bottom: 1rem; }
    .greeting {
      padding: 1rem;
      border-radius: 8px;
      background: var(--muted, #f0f0f0);
      margin-bottom: 1rem;
    }
    input {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid var(--border, #ccc);
      border-radius: 4px;
      margin-bottom: 0.5rem;
      font-size: 1rem;
    }
    button {
      width: 100%;
      padding: 0.5rem 1rem;
      background: var(--primary, #0066cc);
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1rem;
    }
    button:hover { opacity: 0.9; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Hello World App</h1>
    <div class="greeting" id="greeting">Welcome to the Smappy MCP App!</div>
    <input type="text" id="nameInput" placeholder="Enter your name">
    <button id="greetBtn">Say Hello</button>
  </div>
  <script>
    const greeting = document.getElementById('greeting');
    const nameInput = document.getElementById('nameInput');
    const greetBtn = document.getElementById('greetBtn');

    // MCP App communication
    let hostOrigin = '*';
    let requestId = 0;

    function sendMessage(method, params = {}) {
      const msg = { jsonrpc: '2.0', id: ++requestId, method, params };
      window.parent.postMessage(msg, hostOrigin);
      return requestId;
    }

    function sendNotification(method, params = {}) {
      const msg = { jsonrpc: '2.0', method, params };
      window.parent.postMessage(msg, hostOrigin);
    }

    // Handle messages from host
    window.addEventListener('message', (event) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      // Handle initialize response
      if (data.result && data.result.hostContext) {
        const ctx = data.result.hostContext;
        // Apply theme variables if provided
        if (ctx.styles?.variables) {
          Object.entries(ctx.styles.variables).forEach(([key, value]) => {
            document.documentElement.style.setProperty(key, value);
          });
        }
      }

      // Handle tool input notification
      if (data.method === 'ui/notifications/tool-input') {
        const args = data.params?.arguments || {};
        if (args.name) {
          nameInput.value = args.name;
          updateGreeting(args.name);
        }
      }
    });

    function updateGreeting(name) {
      greeting.textContent = name ? \`Hello, \${name}! 👋\` : 'Welcome to the Smappy MCP App!';
    }

    greetBtn.addEventListener('click', () => {
      const name = nameInput.value.trim();
      updateGreeting(name);
      // Notify host about the action
      sendNotification('notifications/message', {
        level: 'info',
        data: \`User greeted: \${name || 'anonymous'}\`
      });
    });

    nameInput.addEventListener('input', () => {
      updateGreeting(nameInput.value.trim());
    });

    // Initialize connection with host
    sendMessage('ui/initialize', {
      protocolVersion: '2024-11-05',
      clientInfo: { name: 'hello-app', version: '1.0.0' },
      capabilities: {}
    });
  </script>
</body>
</html>`;

async function createSession(): Promise<{
  sessionId: string;
  client: Client;
}> {
  const sessionId = crypto.randomUUID();

  // Create linked in-memory transports
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  // Create a fresh server instance for this session
  const sessionServer = new McpServer({
    name: "smappy-mcp",
    version: "1.0.0",
  });

  // Register the Hello World MCP App as a UI resource
  sessionServer.registerResource(
    "hello-app",
    "ui://smappy/hello-app",
    {
      description: "A simple Hello World MCP App",
      mimeType: "text/html;profile=mcp-app",
    },
    async () => ({
      contents: [
        {
          uri: "ui://smappy/hello-app",
          mimeType: "text/html;profile=mcp-app",
          text: helloAppHtml,
        },
      ],
    }),
  );

  // Register a tool that links to the UI resource
  sessionServer.registerTool(
    "greet",
    {
      title: "Greet User",
      description:
        "Display an interactive greeting app where users can enter their name",
      _meta: {
        "ui/resourceUri": "ui://smappy/hello-app",
      },
    },
    async () => ({
      content: [
        {
          type: "text" as const,
          text: "Hello! Use the interactive greeting app to say hello.",
        },
      ],
    }),
  );

  // Connect server to its transport
  await sessionServer.connect(serverTransport);

  // Create client to communicate with the server
  const client = new Client({
    name: "smappy-mcp-client",
    version: "1.0.0",
  });

  await client.connect(clientTransport);

  sessions.set(sessionId, {
    client,
    cleanup: async () => {
      await client.close();
      await sessionServer.close();
    },
  });

  return { sessionId, client };
}

export const Route = createFileRoute("/api/mcp")({
  server: {
    handlers: {
      // Handle JSON-RPC requests via POST
      POST: async ({ request }: { request: Request }) => {
        const body = await request.json();
        const sessionId = request.headers.get("mcp-session-id");

        // Handle initialization
        if (body.method === "initialize") {
          const { sessionId: newSessionId } = await createSession();

          // Return server capabilities
          const serverInfo = {
            protocolVersion: "2024-11-05",
            serverInfo: {
              name: "smappy-mcp",
              version: "1.0.0",
            },
            capabilities: {
              extensions: {
                "io.modelcontextprotocol/ui": {
                  mimeTypes: ["text/html;profile=mcp-app"],
                },
              },
              resources: {},
              tools: {},
            },
          };

          return new Response(
            JSON.stringify({
              jsonrpc: "2.0",
              id: body.id,
              result: serverInfo,
            }),
            {
              headers: {
                "Content-Type": "application/json",
                "Mcp-Session-Id": newSessionId,
              },
            },
          );
        }

        // For other requests, require a session
        if (!sessionId) {
          return new Response(
            JSON.stringify({
              jsonrpc: "2.0",
              error: { code: -32600, message: "Session ID required" },
              id: body.id ?? null,
            }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const session = sessions.get(sessionId);
        if (!session) {
          return new Response(
            JSON.stringify({
              jsonrpc: "2.0",
              error: { code: -32600, message: "Invalid session" },
              id: body.id ?? null,
            }),
            { status: 404, headers: { "Content-Type": "application/json" } },
          );
        }

        const { client } = session;

        try {
          let result: unknown;

          switch (body.method) {
            case "ping":
              result = {};
              break;

            case "initialized":
              // Notification, no response needed
              return new Response(null, {
                status: 202,
                headers: { "Mcp-Session-Id": sessionId },
              });

            case "resources/list":
              result = await client.listResources();
              break;

            case "resources/read":
              result = await client.readResource({ uri: body.params.uri });
              break;

            case "tools/list":
              result = await client.listTools();
              break;

            case "tools/call":
              result = await client.callTool({
                name: body.params.name,
                arguments: body.params.arguments,
              });
              break;

            default:
              return new Response(
                JSON.stringify({
                  jsonrpc: "2.0",
                  error: {
                    code: -32601,
                    message: `Method not found: ${body.method}`,
                  },
                  id: body.id,
                }),
                {
                  status: 200,
                  headers: {
                    "Content-Type": "application/json",
                    "Mcp-Session-Id": sessionId,
                  },
                },
              );
          }

          return new Response(
            JSON.stringify({
              jsonrpc: "2.0",
              id: body.id,
              result,
            }),
            {
              headers: {
                "Content-Type": "application/json",
                "Mcp-Session-Id": sessionId,
              },
            },
          );
        } catch (error) {
          return new Response(
            JSON.stringify({
              jsonrpc: "2.0",
              error: {
                code: -32603,
                message:
                  error instanceof Error ? error.message : "Internal error",
              },
              id: body.id,
            }),
            {
              status: 500,
              headers: {
                "Content-Type": "application/json",
                "Mcp-Session-Id": sessionId,
              },
            },
          );
        }
      },

      // Handle session termination
      DELETE: async ({ request }: { request: Request }) => {
        const sessionId = request.headers.get("mcp-session-id");

        if (sessionId && sessions.has(sessionId)) {
          const session = sessions.get(sessionId);
          await session?.cleanup();
          sessions.delete(sessionId);
        }

        return new Response(null, { status: 204 });
      },
    },
  },
});
