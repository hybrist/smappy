import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Bot, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from "@/components/ai-elements/reasoning";

export const Route = createFileRoute("/chat")({
  component: ChatPage,
});

function ChatPage() {
  const [input, setInput] = useState("");

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  });

  const isLoading = status === "submitted" || status === "streaming";

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-6 flex flex-col max-w-4xl overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold tracking-tight">AI Assistant</h1>
          <p className="text-muted-foreground">
            Chat with our AI to get help with bundle analysis and optimization
            suggestions.
          </p>
        </motion.div>

        <div className="flex-1 flex flex-col bg-card border border-border rounded-lg overflow-hidden min-h-0">
          <Conversation className="flex-1">
            <ConversationContent>
              {messages.length === 0 ? (
                <ConversationEmptyState
                  title="How can I help you today?"
                  description="Ask me about bundle analysis, performance optimizations, tree-shaking, code splitting, or any other bundling topics."
                  icon={<Bot className="w-12 h-12 text-primary/50" />}
                />
              ) : (
                <>
                  {messages.map((message) => (
                    <Message key={message.id} from={message.role}>
                      <MessageContent>
                        {message.parts.map((part, partIndex) => {
                          if (part.type === "reasoning") {
                            return (
                              <Reasoning
                                key={partIndex}
                                isStreaming={
                                  status === "streaming" &&
                                  message.id ===
                                    messages[messages.length - 1]?.id
                                }
                              >
                                <ReasoningTrigger />
                                <ReasoningContent>{part.text}</ReasoningContent>
                              </Reasoning>
                            );
                          }
                          if (part.type === "text") {
                            return (
                              <MessageResponse key={partIndex}>
                                {part.text}
                              </MessageResponse>
                            );
                          }
                          return null;
                        })}
                      </MessageContent>
                    </Message>
                  ))}
                  {status === "submitted" && (
                    <Message from="assistant">
                      <MessageContent>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Thinking...</span>
                        </div>
                      </MessageContent>
                    </Message>
                  )}
                </>
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          <div className="border-t p-4 bg-background/50">
            <PromptInput
              onSubmit={({ text }) => {
                if (text.trim() && !isLoading) {
                  sendMessage({ text });
                  setInput("");
                }
              }}
            >
              <PromptInputTextarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about bundle optimization..."
                disabled={isLoading}
              />
              <PromptInputFooter>
                <div />
                <PromptInputSubmit
                  status={status}
                  disabled={isLoading || !input.trim()}
                />
              </PromptInputFooter>
            </PromptInput>
          </div>
        </div>
      </main>
    </div>
  );
}
