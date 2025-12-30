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

// Helper to serialize encoded args (string or FormData) to a transferable format
// FormData cannot be sent via postMessage, so we convert it to a string representation
async function serializeEncodedArgs(
  encoded: string | FormData,
): Promise<{ type: 'string' | 'formdata'; data: string }> {
  if (typeof encoded === 'string') {
    return { type: 'string', data: encoded };
  }

  // FormData needs to be serialized. We convert it to a multipart/form-data body
  // and then base64 encode it for transport.
  const response = new Response(encoded);
  const contentType = response.headers.get('content-type') || '';
  const arrayBuffer = await response.arrayBuffer();
  const base64 = btoa(
    String.fromCharCode(...new Uint8Array(arrayBuffer)),
  );
  return {
    type: 'formdata',
    data: JSON.stringify({ contentType, body: base64 }),
  };
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
  app.ontoolinput = ((_args) => {
    // Could show loading state with the input args here
  });

  // Set up server action callback to route through MCP
  setServerCallback(async (actionId: string, args: unknown[]) => {
    const temporaryReferences = createTemporaryReferenceSet();
    const encodedArgs = await encodeReply(args, { temporaryReferences });
    
    // Serialize the encoded args for postMessage transport
    // (FormData cannot be cloned for postMessage)
    const serializedArgs = await serializeEncodedArgs(encodedArgs);

    // Call the dispatch-action tool via MCP
    const result = (await app.callServerTool({
      name: '_rsc.dispatch-action',
      arguments: {
        actionId,
        argsType: serializedArgs.type,
        args: serializedArgs.data,
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

  // Intercept form submissions to ensure they're handled by React Server Components.
  // In sandboxed iframes, native form submission can be blocked even with allow-forms
  // (e.g., if allow-same-origin is missing or navigation is restricted).
  // React's form handlers run in the bubble phase. If they've already prevented default
  // (meaning they handled the server action), we don't need to do anything. Otherwise,
  // we prevent default to avoid sandbox navigation restrictions.
  document.addEventListener('submit', (e) => {
    const form = e.target as HTMLFormElement;
    if (!form || !rootElement.contains(form)) return;
    
    // If React has already prevented default, it means React handled the form.
    // Otherwise, prevent default to avoid sandbox restrictions. React can still
    // process server actions even if default is prevented (it extracts FormData
    // from the form element, not from the actual submission).
    if (!e.defaultPrevented) {
      e.preventDefault();
    }
  }, false); // Bubble phase: React's handlers run here too

  // Initialize MCP connection
  try {
    await app.connect();
  } catch (error) {
    console.error('Failed to initialize MCP connection:', error);
  }
}

main();
