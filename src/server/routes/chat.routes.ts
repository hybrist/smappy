import { Router } from 'express';
import { streamText } from 'ai';
import { ollama } from 'ollama-ai-provider-v2';

const router = Router();

/**
 * POST /api/chat
 * Send a message and stream the LLM response using AI SDK with Ollama provider
 */
router.post('/', async (req, res) => {
  try {
    const { messages } = req.body;

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
      model: ollama('llama3.2'),
      messages: messages,
    });

    // Stream text chunks from AI SDK to SSE format
    try {
      for await (const textPart of result.textStream) {
        res.write(
          `data: ${JSON.stringify({ type: 'text', content: textPart })}\n\n`,
        );
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
