<script lang="ts">
  import Chat from '$lib/components/Chat.svelte';
</script>

<svelte:head>
  <title>Chat Assistant - Smappy</title>
</svelte:head>

<div class="flex h-screen flex-col bg-gray-50 dark:bg-gray-900">
  <!-- Top navigation -->
  <nav class="border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <a
          href="/dashboard"
          data-sveltekit-preload-data="hover"
          class="flex items-center gap-2 text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Dashboard
        </a>
      </div>

      <div class="flex items-center gap-2">
        <img src="/logo.svg" alt="Smappy Logo" class="h-8 w-8" />
        <span class="text-xl font-bold text-gray-900 dark:text-white">Smappy Chat</span>
      </div>

      <div class="w-32"></div>
      <!-- Spacer for centering -->
    </div>
  </nav>

  <!-- Main chat area -->
  <main class="flex-1 overflow-hidden">
    <div class="mx-auto h-full max-w-5xl">
      <Chat />
    </div>
  </main>

  <!-- Info footer -->
  <footer class="border-t border-gray-200 bg-white px-6 py-3 dark:border-gray-700 dark:bg-gray-800">
    <div class="mx-auto max-w-5xl">
      <p class="text-center text-xs text-gray-500 dark:text-gray-400">
        💡 Tip: You can ask about bundle analysis, optimization strategies, or get code suggestions.
        Make sure Ollama is running locally with your chosen model.
      </p>
    </div>
  </footer>
</div>
