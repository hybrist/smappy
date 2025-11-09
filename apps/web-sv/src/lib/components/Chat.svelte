<script lang="ts">
  interface Message {
    role: 'user' | 'assistant';
    content: string;
  }

  interface Props {
    defaultModel?: string;
    availableModels?: string[];
  }

  let {
    defaultModel = 'qwen2.5-coder:3b',
    availableModels = [
      'qwen2.5-coder:3b',
      'llama3.2:3b',
      'phi3:3.8b',
      'mistral:7b',
      'codellama:7b',
    ],
  }: Props = $props();

  let selectedModel = $state(defaultModel);
  let showModelSelector = $state(false);
  let messages = $state<Message[]>([]);
  let input = $state('');
  let isLoading = $state(false);
  let error = $state<string | null>(null);

  // Auto-scroll to bottom when messages change
  let messagesContainer: HTMLDivElement;
  $effect(() => {
    if (messages.length > 0 && messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  });

  function handleModelChange(model: string) {
    selectedModel = model;
    showModelSelector = false;
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();

    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    input = '';
    error = null;

    // Add user message to the conversation
    messages = [...messages, { role: 'user', content: userMessage }];
    isLoading = true;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messages,
          model: selectedModel,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      // Add assistant message placeholder
      messages = [...messages, { role: 'assistant', content: '' }];

      let assistantMessage = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value);
        // For text stream, we just append the chunks directly
        assistantMessage += chunk;
        // Update the last message
        messages = [...messages.slice(0, -1), { role: 'assistant', content: assistantMessage }];
      }
    } catch (err) {
      console.error('Chat error:', err);
      error = err instanceof Error ? err.message : 'An error occurred';
      // Remove the empty assistant message if there was an error
      if (messages[messages.length - 1]?.content === '') {
        messages = messages.slice(0, -1);
      }
    } finally {
      isLoading = false;
    }
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
                onclick={() => handleModelChange(model)}
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
                {message.content}
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
    <form onsubmit={handleSubmit} class="flex gap-2">
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
