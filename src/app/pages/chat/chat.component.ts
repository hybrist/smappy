import { Component, inject, signal, effect, viewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ChatService } from '../../services/chat.service';

@Component({
  selector: 'app-chat',
  imports: [FormsModule],
  template: `
    <div class="flex flex-col h-[calc(100vh-7rem)] bg-white rounded-lg border border-gray-200 shadow-sm">
      <!-- Header -->
      <div class="bg-white shadow-sm border-b border-gray-200 p-4">
        <div class="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Chat</h1>
            <p class="text-sm text-gray-600">Powered by Llama 3.2</p>
          </div>
          <button
            (click)="clearChat()"
            class="text-sm bg-red-50 text-red-700 border border-red-600 px-3 py-1.5 rounded hover:bg-red-100"
          >
            Clear Chat
          </button>
        </div>
      </div>

      <!-- Messages Container -->
      <div class="flex-1 overflow-y-auto p-4 bg-gray-50">
        <div class="max-w-4xl mx-auto space-y-4" #messageContainer>
          @if (chatService.messages().length === 0) {
            <div class="text-center py-12 text-gray-500">
              <svg
                class="w-16 h-16 mx-auto mb-4 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                ></path>
              </svg>
              <p>Start a conversation by typing a message below</p>
            </div>
          }

          @for (message of chatService.messages(); track $index) {
            @if (message.role === 'user') {
              <!-- User Message -->
              <div class="flex justify-end">
                <div class="max-w-3xl bg-blue-600 text-white rounded-lg px-4 py-3">
                  <div class="whitespace-pre-wrap">{{ message.content }}</div>
                </div>
              </div>
            } @else {
              <!-- Assistant Message -->
              <div class="flex justify-start">
                <div class="max-w-3xl bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm">
                  <div class="flex items-start">
                    <svg
                      class="w-5 h-5 text-gray-600 mr-2 flex-shrink-0 mt-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z"
                      ></path>
                      <path
                        d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z"
                      ></path>
                    </svg>
                    <div class="flex-1 whitespace-pre-wrap">
                      {{ message.content || '...' }}
                    </div>
                  </div>
                </div>
              </div>
            }
          }

          @if (chatService.error()) {
            <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <div class="flex items-start">
                <svg
                  class="w-5 h-5 mr-2 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clip-rule="evenodd"
                  ></path>
                </svg>
                <div>{{ chatService.error() }}</div>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Input Area -->
      <div class="bg-white border-t border-gray-200 p-4">
        <div class="max-w-4xl mx-auto">
          <form (submit)="sendMessage($event)" class="flex gap-2">
            <input
              type="text"
              [(ngModel)]="inputMessage"
              name="message"
              placeholder="Type your message..."
              [disabled]="chatService.isStreaming()"
              class="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
            <button
              type="submit"
              [disabled]="!inputMessage().trim() || chatService.isStreaming()"
              class="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              @if (chatService.isStreaming()) {
                <div class="flex items-center">
                  <svg
                    class="animate-spin h-5 w-5 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      class="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      stroke-width="4"
                    ></circle>
                    <path
                      class="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Sending...
                </div>
              } @else {
                Send
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [],
})
export class ChatComponent {
  readonly chatService = inject(ChatService);
  private readonly route = inject(ActivatedRoute);

  inputMessage = signal<string>('');
  messageContainer = viewChild<ElementRef>('messageContainer');
  bundleId = signal<string>('');

  constructor() {
    // Get bundleId from route params
    this.route.parent?.paramMap.subscribe((params) => {
      const id = params.get('bundleId');
      if (id) {
        this.bundleId.set(id);
      }
    });

    // Auto-scroll to bottom when messages change
    effect(() => {
      // Access messages to track changes
      this.chatService.messages();

      // Schedule scroll after view updates
      setTimeout(() => {
        this.scrollToBottom();
      }, 0);
    });
  }

  async sendMessage(event: Event): Promise<void> {
    event.preventDefault();

    const message = this.inputMessage().trim();
    if (!message || this.chatService.isStreaming()) {
      return;
    }

    // Clear input immediately
    this.inputMessage.set('');

    // Send message with bundle context
    await this.chatService.sendMessage(message, this.bundleId());
  }

  clearChat(): void {
    this.chatService.clearMessages();
  }

  private scrollToBottom(): void {
    const container = this.messageContainer()?.nativeElement;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }
}
