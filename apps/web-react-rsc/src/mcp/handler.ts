import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { z } from 'zod';

// Import RSC renderer accessor from vite config (set by rscMcpApps plugin)
import { getRscRenderer } from '../../vite.config.ts';

// Import bootstrap HTML generator
import { generateBootstrapHtml } from './bootstrap-html.ts';

// Session storage: maps session IDs to connected client/server pairs
const sessions = new Map<
  string,
  { client: Client; cleanup: () => Promise<void>; baseUrl: string }
>();

async function createSession(baseUrl: string): Promise<{
  sessionId: string;
  client: Client;
}> {
  const sessionId = crypto.randomUUID();

  // Create linked in-memory transports
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  // Create a fresh server instance for this session
  const sessionServer = new McpServer({
    name: 'smappy-mcp-rsc',
    version: '1.0.0',
  });

  // Register the RSC MCP App bootstrap as a UI resource
  sessionServer.registerResource(
    'rsc-app',
    'ui://smappy/rsc-app',
    {
      description: 'RSC-powered MCP App bootstrap',
      mimeType: 'text/html;profile=mcp-app',
    },
    async () => ({
      contents: [
        {
          uri: 'ui://smappy/rsc-app',
          mimeType: 'text/html;profile=mcp-app',
          text: generateBootstrapHtml(baseUrl),
        },
      ],
    }),
  );

  // Register the RSC greeting tool
  sessionServer.registerTool(
    'render-greeting',
    {
      title: 'Render Greeting',
      description:
        'Render an interactive greeting card using React Server Components',
      inputSchema: z.object({
        name: z.string().describe('The name to greet'),
      }),
      _meta: {
        'ui/resourceUri': 'ui://smappy/rsc-app',
      },
    },
    async ({ name }) => {
      const renderer = getRscRenderer();

      if (!renderer) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Hello, ${name}! (RSC renderer not available)`,
            },
          ],
        };
      }

      try {
        const rscPayload = await renderer.renderGreeting({ name });

        return {
          content: [
            {
              type: 'text' as const,
              text: `Greeting card for ${name}`,
            },
          ],
          structuredContent: {
            type: 'rsc',
            payload: rscPayload,
          },
        };
      } catch (error) {
        console.error('[MCP] RSC render error:', error);
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error rendering greeting: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // Register the server action dispatch tool
  sessionServer.registerTool(
    '_rsc.dispatch-action',
    {
      title: 'Dispatch Server Action',
      description: 'Execute an RSC server action and return the updated state',
      inputSchema: z.object({
        actionId: z.string().describe('The server action ID'),
        argsType: z
          .enum(['string', 'formdata'])
          .describe('Type of the encoded args'),
        args: z.string().describe('Encoded action arguments'),
      }),
      _meta: {
        // This tool is only callable from the app, not the model
        'ui/visibility': ['app'],
      },
    },
    async ({ actionId, argsType, args }) => {
      const renderer = getRscRenderer();

      if (!renderer) {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'RSC renderer not available',
            },
          ],
          isError: true,
        };
      }

      try {
        const result = await renderer.dispatchAction(actionId, argsType, args);

        return {
          content: [
            {
              type: 'text' as const,
              text: result.returnValue.ok
                ? 'Action executed successfully'
                : 'Action failed',
            },
          ],
          structuredContent: {
            type: 'rsc',
            payload: result.payload,
          },
        };
      } catch (error) {
        console.error('[MCP] Server action error:', error);
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error executing action: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // Connect server to its transport
  await sessionServer.connect(serverTransport);

  // Create client to communicate with the server
  const client = new Client({
    name: 'smappy-mcp-client',
    version: '1.0.0',
  });

  await client.connect(clientTransport);

  sessions.set(sessionId, {
    client,
    cleanup: async () => {
      await client.close();
      await sessionServer.close();
    },
    baseUrl,
  });

  return { sessionId, client };
}

export const Route = {
  // Handle JSON-RPC requests via POST
  POST: async ({ request }: { request: Request }) => {
    const body = await request.json();
    const sessionId = request.headers.get('mcp-session-id');

    // Handle initialization
    if (body.method === 'initialize') {
      // Get base URL from header (set by middleware) or derive from request
      const baseUrl =
        request.headers.get('x-base-url') ||
        new URL(request.url).origin;
      const { sessionId: newSessionId } = await createSession(baseUrl);

      // Return server capabilities
      const serverInfo = {
        protocolVersion: '2024-11-05',
        serverInfo: {
          name: 'smappy-mcp-rsc',
          version: '1.0.0',
        },
        capabilities: {
          extensions: {
            'io.modelcontextprotocol/ui': {
              mimeTypes: ['text/html;profile=mcp-app'],
            },
          },
          resources: {},
          tools: {},
        },
      };

      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: body.id,
          result: serverInfo,
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Mcp-Session-Id': newSessionId,
          },
        },
      );
    }

    // For other requests, require a session
    if (!sessionId) {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          error: { code: -32600, message: 'Session ID required' },
          id: body.id ?? null,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          error: { code: -32600, message: 'Invalid session' },
          id: body.id ?? null,
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const { client } = session;

    try {
      let result: unknown;

      switch (body.method) {
        case 'ping':
          result = {};
          break;

        case 'initialized':
          // Notification, no response needed
          return new Response(null, {
            status: 202,
            headers: { 'Mcp-Session-Id': sessionId },
          });

        case 'resources/list':
          result = await client.listResources();
          break;

        case 'resources/read':
          result = await client.readResource({ uri: body.params.uri });
          break;

        case 'tools/list':
          result = await client.listTools();
          break;

        case 'tools/call':
          result = await client.callTool({
            name: body.params.name,
            arguments: body.params.arguments,
          });
          break;

        default:
          return new Response(
            JSON.stringify({
              jsonrpc: '2.0',
              error: {
                code: -32601,
                message: `Method not found: ${body.method}`,
              },
              id: body.id,
            }),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
                'Mcp-Session-Id': sessionId,
              },
            },
          );
      }

      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: body.id,
          result,
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Mcp-Session-Id': sessionId,
          },
        },
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : 'Internal error',
          },
          id: body.id,
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Mcp-Session-Id': sessionId,
          },
        },
      );
    }
  },

  // Handle session termination
  DELETE: async ({ request }: { request: Request }) => {
    const sessionId = request.headers.get('mcp-session-id');

    if (sessionId && sessions.has(sessionId)) {
      const session = sessions.get(sessionId);
      await session?.cleanup();
      sessions.delete(sessionId);
    }

    return new Response(null, { status: 204 });
  },
};
