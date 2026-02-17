import { createFileRoute } from '@tanstack/react-router';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState } from 'react';
import { Navbar } from '@/components/layout/navbar';
import { Bot, Loader2 } from 'lucide-react';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import {
  Message,
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from '@/components/ai-elements/prompt-input';
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from '@/components/ai-elements/reasoning';

export const Route = createFileRoute('/chat')({
  component: ChatPage,
});

function ChatPage() {
  const [input, setInput] = useState('');

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col">
      <Navbar />

      <main className="flex-1 flex flex-col overflow-hidden bg-card">
        <div className="flex-1 flex flex-col container mx-auto max-w-4xl overflow-hidden min-h-0">
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
                          if (part.type === 'reasoning') {
                            return (
                              <Reasoning
                                key={partIndex}
                                isStreaming={
                                  status === 'streaming' &&
                                  message.id ===
                                    messages[messages.length - 1]?.id
                                }
                              >
                                <ReasoningTrigger />
                                <ReasoningContent>{part.text}</ReasoningContent>
                              </Reasoning>
                            );
                          }
                          if (part.type === 'text') {
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
                  {status === 'submitted' && (
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
                  setInput('');
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
