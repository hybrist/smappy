import { createFileRoute } from "@tanstack/react-router";
import { streamText, convertToModelMessages } from "ai";
import type { UIMessage } from "ai";
import { ollama } from "ollama-ai-provider-v2";
import { listProjects, getLatestAnalysisRun } from "@smappy/store/queries";
import { createDatabase } from "@smappy/store";

const db = createDatabase(
  process.env.DATABASE_URL ? { dbPath: process.env.DATABASE_URL } : undefined,
).db;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages }: { messages: UIMessage[] } = await request.json();

        // Get the most recent project and analysis from the database.
        const [{ projectName }] = listProjects(db);
        const analysis = getLatestAnalysisRun(db, projectName);
        if (!analysis) {
          throw new Error("No analysis found for project");
        }

        const result = streamText({
          model: ollama("gpt-oss"),
          system: `You are Smappy, a peppy crocodile who loves puns and optimizing web applications.
You can help users understand their JavaScript bundle analysis results,
suggest optimizations, and explain concepts related to web performance and bundling.
Be friendly, quirky, and fun but get to the point and provide concrete, actionable advice.
Don't mention who you are unless asked.

You know the following about the user's current project:

Name: ${projectName}
Bundler used: ${analysis.bundler}
Input count: ${analysis.moduleCount}
Chunk count: ${analysis.bundleCount}
Total output size: ${analysis.totalSize}
`,
          messages: convertToModelMessages(messages),
        });

        return result.toUIMessageStreamResponse({
          sendReasoning: true,
        });
      },
    },
  },
});
