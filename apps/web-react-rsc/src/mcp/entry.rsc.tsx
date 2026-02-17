/**
 * RSC Entry for MCP Tools
 *
 * This module runs in the RSC environment (with react-server condition)
 * and provides rendering functions for MCP tools.
 *
 * It exports functions that can be called from the MCP handler to:
 * - Render server components to RSC flight stream
 * - Handle server action dispatch
 */

import {
  renderToReadableStream,
  createTemporaryReferenceSet,
  decodeReply,
  loadServerAction,
} from '@vitejs/plugin-rsc/rsc';

// Import server components that can be rendered via MCP tools
import { GreetingCard } from './components/GreetingCard.tsx';

// Type for the RSC payload structure
export type RscPayload = {
  root: React.ReactNode;
  returnValue?: { ok: boolean; data: unknown };
};

// Track the current render context so we can re-render after actions
// In a production system, this would be per-session, but for now we use a simple global
let currentRenderContext: {
  componentName: string;
  props: Record<string, unknown>;
} | null = null;

/**
 * Render a greeting card component to RSC flight stream
 * Returns an array of chunks to preserve the original streaming boundaries
 */
export async function renderGreeting(props: { name: string }): Promise<string> {
  // Track the render context for re-rendering after actions
  currentRenderContext = { componentName: 'GreetingCard', props };

  const payload: RscPayload = {
    root: <GreetingCard name={props.name} />,
  };

  const stream = renderToReadableStream<RscPayload>(payload);
  return await streamToChunks(stream);
}

/**
 * Get the current component to render based on the tracked context
 */
function getCurrentComponent(): React.ReactNode {
  if (!currentRenderContext) {
    return null;
  }

  switch (currentRenderContext.componentName) {
    case 'GreetingCard':
      return <GreetingCard name={currentRenderContext.props.name as string} />;
    default:
      return null;
  }
}

/**
 * Deserialize encoded args from the MCP transport format
 * Handles both string and FormData (base64 encoded) formats
 */
async function deserializeEncodedArgs(
  argsType: 'string' | 'formdata',
  argsData: string,
): Promise<string | FormData> {
  if (argsType === 'string') {
    return argsData;
  }

  // Deserialize base64-encoded FormData
  const { contentType, body } = JSON.parse(argsData) as {
    contentType: string;
    body: string;
  };

  // Convert base64 back to Uint8Array
  const binaryString = atob(body);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Use Response.formData() to parse the multipart data
  const response = new Response(bytes, {
    headers: { 'Content-Type': contentType },
  });
  return await response.formData();
}

/**
 * Dispatch a server action and return the result as RSC payload
 */
export async function dispatchAction(
  actionId: string,
  argsType: 'string' | 'formdata',
  encodedArgs: string,
): Promise<{ payload: string; returnValue: { ok: boolean; data: unknown } }> {
  const temporaryReferences = createTemporaryReferenceSet();

  // Deserialize the args based on type
  const decodableArgs = await deserializeEncodedArgs(argsType, encodedArgs);
  const args = await decodeReply(decodableArgs, { temporaryReferences });
  const action = await loadServerAction(actionId);

  let returnValue: { ok: boolean; data: unknown };
  try {
    const data = await action.apply(null, args as unknown[]);
    returnValue = { ok: true, data };
  } catch (e) {
    returnValue = { ok: false, data: e };
  }

  // Re-render the current component with the updated state
  const payload: RscPayload = {
    root: getCurrentComponent(),
    returnValue,
  };

  const stream = renderToReadableStream<RscPayload>(payload, {
    temporaryReferences,
  });
  const payloadString = await streamToString(stream);

  return { payload: payloadString, returnValue };
}

/**
 * Generic render function for any component
 */
export async function renderComponent(
  componentName: string,
  props: Record<string, unknown>,
): Promise<string> {
  let element: React.ReactNode;

  // Component registry - add new components here
  switch (componentName) {
    case 'GreetingCard':
      element = <GreetingCard name={props.name as string} />;
      break;
    default:
      throw new Error(`Unknown component: ${componentName}`);
  }

  const payload: RscPayload = {
    root: element,
  };

  const stream = renderToReadableStream<RscPayload>(payload);
  return await streamToString(stream);
}

/**
 * Helper to convert a ReadableStream to a string
 */
async function streamToString(
  stream: ReadableStream<Uint8Array>,
): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }

  result += decoder.decode(); // Flush remaining
  return result;
}

/**
 * Collect stream chunks as an array of strings, preserving the original chunk boundaries.
 * This is important because the RSC client parser expects data in the same chunks
 * as the server emitted them.
 */
async function streamToChunks(
  stream: ReadableStream<Uint8Array>,
): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    if (chunk) {
      chunks.push(chunk);
    }
  }

  // Flush remaining
  const remaining = decoder.decode();
  if (remaining) {
    chunks.push(remaining);
  }

  return chunks.join('');
}
