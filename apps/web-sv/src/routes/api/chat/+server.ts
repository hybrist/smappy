import { streamText } from 'ai';
import { ollama } from 'ollama-ai-provider-v2';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { messages, model = 'qwen2.5-coder:3b' } = await request.json();

    // Create a streaming response using the AI SDK
    const result = streamText({
      model: ollama(model),
      messages,
      temperature: 0.7,
    });

    // Return the streaming response
    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
