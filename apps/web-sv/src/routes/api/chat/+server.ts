import { streamText } from 'ai';
import { ollama } from 'ollama-ai-provider-v2';
import type { RequestHandler } from './$types';
import type { AnalysisSummary } from '$lib/server/query/types';

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

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { messages, model = 'qwen2.5-coder:3b', context } = await request.json();

    // Create system prompt with context
    const systemPrompt = createSystemPrompt(context);

    // Prepend system message to the conversation
    const messagesWithSystem = [{ role: 'system' as const, content: systemPrompt }, ...messages];

    // Create a streaming response using the AI SDK
    const result = streamText({
      model: ollama(model),
      messages: messagesWithSystem,
      temperature: 0.7,
    });

    // Return the streaming response
    return result.toTextStreamResponse();
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
