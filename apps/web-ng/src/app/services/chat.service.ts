import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';

export interface ToolCall {
  toolCallId: string;
  toolName: string;
  input: any;
  output?: any;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCall[];
}

/**
 * Chat service that manages conversation with LLM
 * Uses Server-Sent Events (SSE) for streaming responses
 */
@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/chat';

  // Reactive state with signals
  readonly messages = signal<Message[]>([]);
  readonly isStreaming = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  /**
   * Send a message and stream the response
   * @param content User message content
   * @param bundleId Optional bundle ID for context
   */
  async sendMessage(content: string, bundleId?: string): Promise<void> {
    if (this.isStreaming()) {
      console.warn('Already streaming a response');
      return;
    }

    // Add user message
    const userMessage: Message = { role: 'user', content };
    this.messages.update((messages) => [...messages, userMessage]);

    // Create placeholder for assistant message
    const assistantMessage: Message = { role: 'assistant', content: '' };
    this.messages.update((messages) => [...messages, assistantMessage]);

    this.isStreaming.set(true);
    this.error.set(null);

    try {
      await this.streamResponse(bundleId);
    } catch (err) {
      console.error('Error sending message:', err);
      this.error.set('Failed to send message. Please try again.');
      // Remove the placeholder assistant message on error
      this.messages.update((messages) => messages.slice(0, -1));
    } finally {
      this.isStreaming.set(false);
    }
  }

  /**
   * Stream the response from the server using fetch and SSE
   * @param bundleId Optional bundle ID for context
   */
  private async streamResponse(bundleId?: string): Promise<void> {
    const currentMessages = this.messages();

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: currentMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        bundleId,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        // Decode the chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages (separated by \n\n)
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || ''; // Keep incomplete message in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'text') {
              // Append text to the last message
              this.messages.update((messages) => {
                const updated = [...messages];
                const lastMessage = updated[updated.length - 1];
                if (lastMessage && lastMessage.role === 'assistant') {
                  lastMessage.content += data.content;
                }
                return updated;
              });
            } else if (data.type === 'tool-call') {
              // Tool is being called - add to toolCalls
              this.messages.update((messages) => {
                const updated = [...messages];
                const lastMessage = updated[updated.length - 1];
                if (lastMessage && lastMessage.role === 'assistant') {
                  if (!lastMessage.toolCalls) {
                    lastMessage.toolCalls = [];
                  }
                  lastMessage.toolCalls.push({
                    toolCallId: data.toolCallId,
                    toolName: data.toolName,
                    input: data.input,
                  });
                }
                return updated;
              });
            } else if (data.type === 'tool-result') {
              // Tool result received - update the corresponding tool call by ID
              this.messages.update((messages) => {
                const updated = [...messages];
                const lastMessage = updated[updated.length - 1];
                if (
                  lastMessage &&
                  lastMessage.role === 'assistant' &&
                  lastMessage.toolCalls
                ) {
                  // Find the tool call with matching ID
                  const toolCall = lastMessage.toolCalls.find(
                    (tc) => tc.toolCallId === data.toolCallId,
                  );
                  if (toolCall) {
                    toolCall.output = data.output;
                  }
                }
                return updated;
              });
            } else if (data.type === 'error') {
              this.error.set(data.error || 'An error occurred');
            }
            // data.type === 'done' means stream is complete
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Clear all messages
   */
  clearMessages(): void {
    this.messages.set([]);
    this.error.set(null);
  }

  /**
   * Reset a conversation with optional initial system message
   */
  reset(systemMessage?: string): void {
    if (systemMessage) {
      this.messages.set([{ role: 'assistant', content: systemMessage }]);
    } else {
      this.messages.set([]);
    }
    this.error.set(null);
  }
}
