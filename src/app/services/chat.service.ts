import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
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
   */
  async sendMessage(content: string): Promise<void> {
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
      await this.streamResponse();
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
   */
  private async streamResponse(): Promise<void> {
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
