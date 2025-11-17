import { stepCountIs, streamText } from 'ai';
import { ollama } from 'ollama-ai-provider-v2';
import { createBundleTools } from '@smappy/llm-tools';
import { db } from '$lib/server/db';
import { schema } from '@smappy/store';
import { desc, eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import type { ChatStreamEvent } from '$lib/chat/stream-schema';
import { chatRequestSchema } from '$lib/chat/request-schema';
import * as v from 'valibot';

import type { ChatRequestBody } from '$lib/chat/request-schema';

function createSystemPrompt(context?: ChatRequestBody['context']): string {
  if (!context || !context.analysis) {
    return 'You are a helpful assistant specializing in JavaScript bundle analysis and optimization.';
  }

  const { projectName, analysis } = context;
  const createdAt = analysis.createdAt
    ? new Date(analysis.createdAt).toLocaleString()
    : 'Unknown date';
  const totalSize = analysis.totalSize ?? 0;

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
- Created: ${createdAt}
- Total Size: ${formatBytes(totalSize)}

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

const DEFAULT_MODEL = 'gpt-oss';

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
    const json = await request.json();
    const parsedBody = v.safeParse(chatRequestSchema, json);
    if (!parsedBody.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid request body', details: parsedBody.issues }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    const {
      messages,
      model: parsedModel,
      context,
      analysisId: bodyAnalysisId,
      bundleId: bodyBundleId,
    } = parsedBody.output;

    const requestedModel = parsedModel ?? DEFAULT_MODEL;

    // Validate and sanitize model selection
    const model = ALLOWED_MODELS.includes(requestedModel) ? requestedModel : DEFAULT_MODEL;

    // Resolve analysis and bundle context
    const analysisId = bodyAnalysisId ?? context?.analysisId ?? context?.analysis?.id ?? null;
    if (analysisId === null || analysisId === undefined) {
      return new Response(JSON.stringify({ error: 'analysisId is required for chat tools' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let bundleId = bodyBundleId ?? context?.bundleId ?? null;
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
