import { stepCountIs, streamText } from 'ai';
import { ollama } from 'ollama-ai-provider-v2';
import { createBundleTools } from '@smappy/llm-tools';
import { db } from '$lib/server/db';
import { schema } from '@smappy/store';
import { desc, eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import type { AnalysisSummary } from '$lib/server/query/types';
import type { ChatStreamEvent } from '$lib/chat/stream-schema';

function createSystemPrompt(context?: {
  projectName?: string;
  analysis?: AnalysisSummary;
}): string {
  if (!context || !context.analysis) {
    return 'You are a helpful assistant specializing in JavaScript bundle analysis and optimization.';
  }

  const { projectName, analysis } = context;

  // Format bundle size nicely
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return `You are a helpful assistant specializing in JavaScript bundle analysis and optimization.

You are currently helping with the bundle analysis for the project: ${projectName}

Current Analysis Summary:
- Analysis ID: ${analysis.id}
- Created: ${new Date(analysis.createdAt).toLocaleString()}
- Total Size: ${formatBytes(analysis.totalSize)}

Your role is to:
1. Help users understand their bundle composition and dependencies
2. Suggest optimizations to reduce bundle size
3. Identify potential performance issues
4. Explain bundling concepts and best practices

When answering questions:
- Reference the specific bundle data when relevant
- Provide actionable, specific suggestions
- Explain trade-offs of different optimization strategies
- Be concise but thorough

The user can see the full bundle visualization in the dashboard, so you can reference specific modules or dependencies they might be looking at.`;
}

const ALLOWED_MODELS = [
  'gpt-oss',
  'qwen2.5-coder:3b',
  'llama3.2:3b',
  'phi3:3.8b',
  'mistral:7b',
  'codellama:7b',
];

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const {
      messages,
      model: requestedModel = 'qwen2.5-coder:3b',
      context,
      analysisId: bodyAnalysisId,
      bundleId: bodyBundleId,
    } = body;

    // Validate messages format
    if (
      !Array.isArray(messages) ||
      messages.some(
        (msg) =>
          typeof msg !== 'object' ||
          typeof msg.role !== 'string' ||
          typeof msg.content !== 'string',
      )
    ) {
      return new Response(JSON.stringify({ error: 'Invalid messages format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate and sanitize model selection
    const model = ALLOWED_MODELS.includes(requestedModel) ? requestedModel : 'qwen2.5-coder:3b';

    // Resolve analysis and bundle context
    const analysisId = normalizeNumeric(
      bodyAnalysisId ?? context?.analysis?.id ?? context?.analysisId,
    );
    if (!analysisId) {
      return new Response(JSON.stringify({ error: 'analysisId is required for chat tools' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let bundleId = normalizeNumeric(bodyBundleId ?? context?.bundleId ?? context?.bundle?.id);
    if (!bundleId) {
      const fallbackBundle = await db
        .select({ id: schema.bundle.id })
        .from(schema.bundle)
        .where(eq(schema.bundle.analysisRunId, analysisId))
        .orderBy(desc(schema.bundle.id))
        .limit(1);

      bundleId = fallbackBundle[0]?.id ?? null;
    }

    if (!bundleId) {
      return new Response(JSON.stringify({ error: 'No bundle found for the analysis run' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const tools = createBundleTools({
      db,
      analysisId,
      bundle: { id: bundleId },
    });

    // Create system prompt with context
    const systemPrompt = createSystemPrompt(context);

    // Prepend system message to the conversation
    const messagesWithSystem = [{ role: 'system' as const, content: systemPrompt }, ...messages];

    const result = streamText({
      model: ollama(model),
      messages: messagesWithSystem,
      system: `You are an expert in web development and web performance.
              You are given a message from a user about a JavaScript bundle.
              It consists of a set of chunks that are loaded together.`,
      stopWhen: stepCountIs(10),
      tools,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (payload: ChatStreamEvent) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        };

        try {
          for await (const part of result.fullStream) {
            switch (part.type) {
              case 'text-delta':
                send({ type: 'text', content: part.text });
                break;
              case 'tool-call':
                send({
                  type: 'tool-call',
                  toolCallId: part.toolCallId,
                  toolName: part.toolName,
                  input: part.input,
                });
                break;
              case 'tool-result':
                send({
                  type: 'tool-result',
                  toolCallId: part.toolCallId,
                  toolName: part.toolName,
                  output: part.output,
                });
                break;
              case 'error': {
                const partError = (part.error as Error | undefined)?.message ?? 'Stream error';
                send({
                  type: 'error',
                  error: partError,
                });
                break;
              }
              case 'finish':
                break;
            }
          }

          send({ type: 'done' });
        } catch (err) {
          console.error('Chat stream error:', err);
          send({
            type: 'error',
            error: err instanceof Error ? err.message : 'Stream error',
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
};

function normalizeNumeric(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}
