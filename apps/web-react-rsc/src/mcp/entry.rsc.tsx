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
 */
export async function renderGreeting(props: { name: string }): Promise<string> {
  const payload: RscPayload = {
    root: <GreetingCard name={props.name} />,
  };

  const stream = renderToReadableStream<RscPayload>(payload);
  return await streamToString(stream);
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
 * Filters out debug/development-only information that can cause parsing issues
 * when the payload is deserialized outside of the normal RSC streaming context.
 *
 * Debug line formats in React 19 dev mode:
 * - `:N<timestamp>` - timing marker
 * - `N:D{...}` or `N:D"..."` - debug/timing data for chunk N
 * - `N:{"env":"Server","stack":...}` - owner stack info
 * - `N:[[...]]` with `false]]` - stack trace arrays
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

  const lines = result.split('\n');

  // Collect debug chunk IDs that are ONLY used for debug info
  // (to clean up references to them in other chunks)
  const debugOnlyChunkIds = new Set<string>();

  // First pass: identify chunks that are purely debug info
  for (const line of lines) {
    if (!line.trim()) continue;

    const chunkMatch = line.match(/^(\d+):/);
    if (!chunkMatch) continue;

    const chunkId = chunkMatch[1];

    // Debug owner stack chunks contain "env":"Server" and "stack":
    if (line.includes('"env":"Server"') && line.includes('"stack":')) {
      debugOnlyChunkIds.add(chunkId);
    }

    // Debug stack trace array chunks (format: N:[["name","file",line,col,...]])
    if (/^\d+:\[\[/.test(line) && line.includes(',false]]')) {
      debugOnlyChunkIds.add(chunkId);
    }
  }

  // Filter lines based on content, not chunk ID
  const filteredLines = lines
    .filter((line) => {
      if (!line.trim()) return false;

      // Filter timing markers
      if (line.startsWith(':N')) return false;

      // Filter debug/timing data lines (N:D...)
      if (/^\d+:D/.test(line)) return false;

      // Filter owner stack info lines
      if (line.includes('"env":"Server"') && line.includes('"stack":'))
        return false;

      // Filter stack trace array lines
      if (/^\d+:\[\[/.test(line) && line.includes(',false]]')) return false;

      return true;
    })
    .map((line) => {
      // Remove references to debug chunks in element arrays
      // Format: ["$","tag",key,props,"$debugId","$debugId2",ownerIndex]
      let cleaned = line;
      for (const debugId of debugOnlyChunkIds) {
        cleaned = cleaned.replace(new RegExp(`,\"\\$${debugId}\"`, 'g'), '');
      }
      // Clean up trailing owner info index (a number before the final ])
      // Pattern: ,...,N] where N is the owner index
      cleaned = cleaned.replace(/,(\d+)\]$/g, ']');
      return cleaned;
    });

  return filteredLines.join('\n');
}
