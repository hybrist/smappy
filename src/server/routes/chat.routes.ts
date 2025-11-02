import { stepCountIs, streamText } from 'ai';
import { Router } from 'express';
import { ollama } from 'ollama-ai-provider-v2';
import { z } from 'zod';
import { getBundleOverview } from '../services/chat-tools.service.js';

const router = Router();

/**
 * POST /api/chat
 * Send a message and stream the LLM response using AI SDK with Ollama provider
 */
router.post('/', async (req, res) => {
  try {
    const { messages, bundleId } = req.body;

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: 'Messages array is required' });
      return;
    }

    // Set up SSE headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Use AI SDK with Ollama provider
    const result = streamText({
      // model: ollama('llama3.2'),
      model: ollama('gpt-oss'),
      messages: messages,
      system: `You are an expert in web development and web performance.
              You are given a message from a user about a JavaScript bundle.
              It consists of a set of chunks that are loaded together.`,
      stopWhen: stepCountIs(4),
      tools: {
        get_bundle_overview: {
          description:
            'Get a high-level overview of the bundle including total size, chunk count, source file count, and the largest chunks. Use this when the user asks about bundle size, contents, or general information.',
          inputSchema: z.object({}),
          type: 'function',
          execute: async () => {
            return await getBundleOverview(bundleId);
          },
        },
      },
    });

    // Stream all parts from AI SDK to SSE format (includes text and tool calls)
    try {
      for await (const part of result.fullStream) {
        switch (part.type) {
          case 'text-delta':
            res.write(
              `data: ${JSON.stringify({ type: 'text', content: part.text })}\n\n`,
            );
            break;

          case 'tool-call':
            res.write(
              `data: ${JSON.stringify({ type: 'tool-call', toolName: part.toolName, input: part.input })}\n\n`,
            );
            break;

          case 'tool-result':
            res.write(
              `data: ${JSON.stringify({ type: 'tool-result', toolName: part.toolName, output: part.output })}\n\n`,
            );
            break;

          case 'finish':
            // Stream is complete
            break;

          case 'error':
            console.error('Error in stream:', part.error);
            res.write(
              `data: ${JSON.stringify({ type: 'error', error: part.error })}\n\n`,
            );
            break;
        }
      }

      // Send completion event
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
    } catch (streamError) {
      console.error('Error during streaming:', streamError);
      res.write(
        `data: ${JSON.stringify({ type: 'error', error: 'Stream error' })}\n\n`,
      );
      res.end();
    }
  } catch (error) {
    console.error('Error in chat endpoint:', error);

    // Send error event if possible
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.write(
        `data: ${JSON.stringify({ type: 'error', error: 'Stream error' })}\n\n`,
      );
      res.end();
    }
  }
});

export default router;
