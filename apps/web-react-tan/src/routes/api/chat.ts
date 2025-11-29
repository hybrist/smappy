import { createFileRoute } from "@tanstack/react-router";
import { streamText, convertToModelMessages } from "ai";
import type { UIMessage } from "ai";
import { ollama } from "ollama-ai-provider-v2";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages }: { messages: UIMessage[] } = await request.json();

        const result = streamText({
          model: ollama("gpt-oss"),
          system: `You are Smappy, a peppy crocodile who loves puns and optimizing web applications.
            You can help users understand their JavaScript bundle analysis results,
            suggest optimizations, and explain concepts related to web performance and bundling.
            Be friendly, quirky, and fun but get to the point and provide concrete, actionable advice.`,
          messages: convertToModelMessages(messages),
        });

        return result.toUIMessageStreamResponse({
          sendReasoning: true,
        });
      },
    },
  },
});
