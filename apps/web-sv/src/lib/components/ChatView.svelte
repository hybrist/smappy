<script lang="ts">
  import { marked } from 'marked';
  import DOMPurify from 'isomorphic-dompurify';
  import { isToolOrDynamicToolUIPart, type UIMessage } from 'ai';

  let {
    messages,
    input = $bindable(),
    isLoading,
    error,
    selectedModel,
    availableModels,
    showModelSelector = $bindable(),
    expandedToolCalls,
    onSubmit,
    onModelChange,
    onToggleToolCall,
  }: {
    messages: UIMessage[];
    input: string;
    isLoading: boolean;
    error: string | null;
    selectedModel: string;
    availableModels: string[];
    showModelSelector: boolean;
    expandedToolCalls: Record<string, boolean>;
    onSubmit: (e: SubmitEvent) => void;
    onModelChange: (model: string) => void;
    onToggleToolCall: (messageIndex: number, toolIndex: number) => void;
  } = $props();

  // Auto-scroll to bottom when messages change
  let messagesContainer: HTMLDivElement;
  $effect(() => {
    if (messages.length > 0 && messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  });

  function renderMarkdown(content: string): string {
    if (!content) return '';
    const dirty = marked.parse(content, { async: false, gfm: true, breaks: true }) as string;
    return DOMPurify.sanitize(dirty);
  }

  function formatJSON(value: unknown): string {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  function isToolCallExpanded(messageIndex: number, toolIndex: number): boolean {
    return !!expandedToolCalls[`${messageIndex}-${toolIndex}`];
  }

  function hasInputParams(input: unknown): boolean {
    if (!input || typeof input !== 'object') {
      return false;
    }
    if (Array.isArray(input)) {
      return input.length > 0;
    }
    return Object.keys(input as Record<string, unknown>).length > 0;
  }
</script>

<div class="flex h-full flex-col bg-white dark:bg-gray-900">
  <!-- Header with model selector -->
  <div class="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Chat Assistant</h2>

      <div class="relative">
        <button
          onclick={() => (showModelSelector = !showModelSelector)}
          class="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
            />
          </svg>
          {selectedModel}
        </button>

        {#if showModelSelector}
          <div
            class="absolute top-full right-0 z-10 mt-2 min-w-[200px] rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
          >
            {#each availableModels as model (model)}
              <button
                onclick={() => onModelChange(model)}
                class="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 {selectedModel ===
                model
                  ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
                  : 'text-gray-700 dark:text-gray-200'}"
              >
                {model}
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Messages area -->
  <div bind:this={messagesContainer} class="flex-1 overflow-y-auto px-4 py-4">
    {#if messages.length === 0}
      <div class="flex h-full items-center justify-center text-gray-500 dark:text-gray-400">
        <div class="text-center">
          <svg class="mx-auto mb-4 h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
          <p class="text-lg font-medium">Start a conversation</p>
          <p class="mt-1 text-sm">
            Ask me anything about your bundle analysis or code optimization
          </p>
        </div>
      </div>
    {:else}
      <div class="space-y-4">
        {#each messages as message, index (index)}
          <div class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'}">
            <div
              class="{message.role === 'user'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white'} max-w-[80%] rounded-lg px-4 py-2"
            >
              <div class="mb-1 flex items-center gap-2">
                <span class="text-xs font-semibold opacity-70">
                  {message.role === 'user' ? 'You' : 'Assistant'}
                </span>
              </div>
              <div class="text-sm break-words whitespace-pre-wrap">
                <div class="prose prose-sm dark:prose-invert max-w-none">
                  {#each message.parts as part, partIndex (partIndex)}
                    {#if part.type === 'text'}
                      <!-- Sanitized via DOMPurify before rendering -->
                      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                      {@html renderMarkdown(part.text)}
                    {:else if isToolOrDynamicToolUIPart(part)}
                      <div
                        class="rounded-md bg-white/80 text-xs text-gray-800 dark:bg-gray-900/70 dark:text-gray-100"
                      >
                        <button
                          type="button"
                          class="flex w-full items-center justify-between gap-3 border-b border-gray-200 px-3 py-2 text-left dark:border-gray-800"
                          onclick={() => onToggleToolCall(index, partIndex)}
                        >
                          <div class="font-semibold">
                            🔧 {'toolName' in part ? part.toolName : part.type.slice(5)}
                            <span class="ml-2 text-[10px] tracking-wide text-gray-500 uppercase">
                              {part.output === undefined ? 'pending' : 'done'}
                            </span>
                          </div>
                          <span class="text-[11px] font-medium text-blue-600 dark:text-blue-300">
                            {isToolCallExpanded(index, partIndex) ? 'Hide' : 'Show'}
                          </span>
                        </button>
                        {#if isToolCallExpanded(index, partIndex)}
                          <div class="space-y-3 px-3 py-3">
                            {#if hasInputParams(part.input)}
                              <div>
                                <div class="text-[11px] tracking-wide text-gray-500 uppercase">
                                  Input
                                </div>
                                <pre
                                  class="mt-1 rounded bg-gray-900/80 p-2 text-[11px] text-gray-100 dark:bg-black/40">{formatJSON(
                                    part.input,
                                  )}</pre>
                              </div>
                            {/if}
                            {#if part.output !== undefined}
                              <div>
                                <div class="text-[11px] tracking-wide text-gray-500 uppercase">
                                  Result
                                </div>
                                <pre
                                  class="mt-1 rounded bg-gray-900/80 p-2 text-[11px] text-gray-100 dark:bg-black/40">{formatJSON(
                                    part.output,
                                  )}</pre>
                              </div>
                            {:else}
                              <div class="text-gray-500">Waiting for result…</div>
                            {/if}
                          </div>
                        {/if}
                      </div>
                    {/if}
                  {/each}
                </div>
              </div>
            </div>
          </div>
        {/each}

        {#if isLoading}
          <div class="flex justify-start">
            <div class="max-w-[80%] rounded-lg bg-gray-100 px-4 py-2 dark:bg-gray-800">
              <div class="flex items-center gap-2">
                <div class="h-2 w-2 animate-pulse rounded-full bg-gray-500"></div>
                <div
                  class="h-2 w-2 animate-pulse rounded-full bg-gray-500"
                  style="animation-delay: 0.2s"
                ></div>
                <div
                  class="h-2 w-2 animate-pulse rounded-full bg-gray-500"
                  style="animation-delay: 0.4s"
                ></div>
              </div>
            </div>
          </div>
        {/if}
      </div>
    {/if}

    {#if error}
      <div
        class="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/20"
      >
        <p class="text-sm text-red-600 dark:text-red-400">
          Error: {error}
        </p>
      </div>
    {/if}
  </div>

  <!-- Input area -->
  <div class="border-t border-gray-200 bg-gray-50 px-4 py-4 dark:border-gray-700 dark:bg-gray-800">
    <form onsubmit={onSubmit} class="flex gap-2">
      <input
        bind:value={input}
        placeholder="Ask me anything..."
        disabled={isLoading}
        class="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:outline-none disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
      />
      <button
        type="submit"
        disabled={isLoading || !input.trim()}
        class="rounded-lg bg-primary-600 px-6 py-2 font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? 'Sending...' : 'Send'}
      </button>
    </form>
    <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
      Using local model: {selectedModel} via Ollama
    </p>
  </div>
</div>
