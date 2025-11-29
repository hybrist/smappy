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
          system:
            "You are a helpful AI assistant for Smappy, a bundle analyzer tool. You can help users understand their JavaScript bundle analysis results, suggest optimizations, and explain concepts related to web performance and bundling.",
          messages: convertToModelMessages(messages),
        });

        return result.toUIMessageStreamResponse();
      },
    },
  },
});
