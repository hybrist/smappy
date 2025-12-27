/**
 * MCP App Bootstrap - RSC Client Entry
 *
 * This is the client-side bootstrap for MCP Apps that use React Server Components.
 * It handles:
 * - MCP postMessage communication with the host (per SEP-1865)
 * - Receiving RSC flight payloads via ui/notifications/tool-result
 * - Deserializing and rendering RSC payloads
 * - Routing server actions back through MCP tools
 */

import {
  createFromReadableStream,
  setServerCallback,
  createTemporaryReferenceSet,
  encodeReply,
} from '@vitejs/plugin-rsc/browser';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@modelcontextprotocol/ext-apps';

// Custom findSourceMapURL that uses document.baseURI instead of window.location.origin
// This is needed because srcdoc iframes have null origin but valid baseURI via <base> tag
function findSourceMapURL(filename: string, environmentName: string): string {
  // Get the base URL from the <base> tag or fall back to document.baseURI
  const baseUrl = document.baseURI || window.location.origin;
  const url = new URL('/__vite_rsc_findSourceMapURL', baseUrl);
  url.searchParams.set('filename', filename);
  url.searchParams.set('environmentName', environmentName);
  return url.toString();
}

// RSC Payload type
interface RscPayload {
  root: React.ReactNode;
  returnValue?: { ok: boolean; data: unknown };
}

// Main application
async function main() {
  const app = new App({ name: 'react-rsc', version: '1.0.0' });
  const rootElement = document.getElementById('root');

  if (!rootElement) {
    console.error('Root element not found');
    return;
  }

  const root = createRoot(rootElement);

  // State for the current RSC payload
  let currentPayload: RscPayload | null = null;
  let setPayloadState: ((payload: RscPayload) => void) | null = null;

  // Component that renders the RSC payload
  function RscRoot() {
    const [payload, setPayload] = React.useState<RscPayload | null>(
      currentPayload,
    );

    React.useEffect(() => {
      setPayloadState = (newPayload) => {
        React.startTransition(() => {
          setPayload(newPayload);
        });
      };
      return () => {
        setPayloadState = null;
      };
    }, []);

    if (!payload) {
      return (
        <div style={{ padding: '1rem', fontFamily: 'system-ui, sans-serif' }}>
          <p>Waiting for RSC payload...</p>
        </div>
      );
    }

    return <>{payload.root}</>;
  }

  // Render the initial loading state
  root.render(
    <React.StrictMode>
      <RscRoot />
    </React.StrictMode>,
  );

  // Helper to convert RSC payload chunks to a ReadableStream
  function chunksToStream(chunks: string): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();

    return new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(chunks));
        controller.close();
      },
    });
  }

  // Handle tool result with RSC payload
  app.ontoolresult = (async (result) => {
    if (
      result.structuredContent?.type === 'rsc' &&
      result.structuredContent.payload &&
      typeof result.structuredContent.payload === 'string'
    ) {
      const chunks = result.structuredContent.payload;
      try {
        const stream = chunksToStream(chunks);
        const payload = await createFromReadableStream<RscPayload>(stream, {
          findSourceMapURL,
        });
        currentPayload = payload;
        if (setPayloadState) {
          setPayloadState(payload);
        }
      } catch (error) {
        console.error('Failed to deserialize RSC payload:', error);
      }
    }
  });

  // Handle tool input (can be used for optimistic updates)
  app.ontoolinput = ((args) => {
    console.log('Tool input received:', args);
    // Could show loading state with the input args here
  });

  // Set up server action callback to route through MCP
  setServerCallback(async (actionId: string, args: unknown[]) => {
    const temporaryReferences = createTemporaryReferenceSet();
    const encodedArgs = await encodeReply(args, { temporaryReferences });

    // Call the dispatch-action tool via MCP
    const result = (await app.callServerTool({
      name: '_rsc.dispatch-action', arguments: {
        actionId,
        args: encodedArgs,
      },
    })) as { structuredContent?: { type: string; payload: string[] } };

    // Parse the returned RSC payload
    if (
      result.structuredContent?.type === 'rsc' &&
      typeof result.structuredContent.payload === 'string'
    ) {
      const stream = chunksToStream(result.structuredContent.payload);
      const payload = await createFromReadableStream<RscPayload>(stream, {
        temporaryReferences,
        findSourceMapURL,
      });
      currentPayload = payload;
      if (setPayloadState) {
        setPayloadState(payload);
      }

      const { ok, data } = payload.returnValue!;
      if (!ok) throw data;
      return data;
    }

    throw new Error('No RSC payload in action response');
  });

  // Initialize MCP connection
  try {
    await app.connect();
    console.log('MCP connection initialized');
  } catch (error) {
    console.error('Failed to initialize MCP connection:', error);
  }
}

main();
