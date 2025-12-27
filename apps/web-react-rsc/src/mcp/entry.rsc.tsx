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

/**
 * Render a greeting card component to RSC flight stream
 * Returns an array of chunks to preserve the original streaming boundaries
 */
export async function renderGreeting(props: { name: string }): Promise<string> {
  const payload: RscPayload = {
    root: <GreetingCard name={props.name} />,
  };

  const stream = renderToReadableStream<RscPayload>(payload);
  return await streamToChunks(stream);
}

/**
 * Dispatch a server action and return the result as RSC payload
 */
export async function dispatchAction(
  actionId: string,
  encodedArgs: string,
): Promise<{ payload: string; returnValue: { ok: boolean; data: unknown } }> {
  const temporaryReferences = createTemporaryReferenceSet();
  const args = await decodeReply(encodedArgs, { temporaryReferences });
  const action = await loadServerAction(actionId);

  let returnValue: { ok: boolean; data: unknown };
  try {
    const data = await action.apply(null, args as unknown[]);
    returnValue = { ok: true, data };
  } catch (e) {
    returnValue = { ok: false, data: e };
  }

  // Re-render the current state after the action
  // For now, we just return an empty root - the actual component to re-render
  // would need to be tracked or passed in
  const payload: RscPayload = {
    root: null,
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
