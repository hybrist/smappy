<script lang="ts">
  import { Chat } from '@ai-sdk/svelte';
  import type { AnalysisSummary } from '$lib/server/query/types';
  import ChatView from './ChatView.svelte';

  interface Props {
    projectName?: string;
    analysis?: AnalysisSummary;
    defaultModel?: string;
    availableModels?: string[];
  }

  let {
    projectName,
    analysis,
    defaultModel = 'gpt-oss',
    availableModels = [
      'gpt-oss',
      'qwen2.5-coder:3b',
      'llama3.2:3b',
      'phi3:3.8b',
      'mistral:7b',
      'codellama:7b',
    ],
  }: Props = $props();

  let selectedModel = $state(defaultModel);
  let showModelSelector = $state(false);
  let input = $state('');
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  let expandedToolCalls = $state<Record<string, boolean>>({});

  const chat = new Chat({
    // TODO: Add id to allow persistence.
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
    isLoading = true;
    try {
      await chat.sendMessage(
        { text: userMessage },
        {
          body: {
            model: selectedModel,
            context: {
              projectName,
              analysis,
            },
          },
        },
      );
    } finally {
      isLoading = false;
    }
  }

  function toggleToolCall(messageIndex: number, toolIndex: number) {
    const key = `${messageIndex}-${toolIndex}`;
    expandedToolCalls = {
      ...expandedToolCalls,
      [key]: !expandedToolCalls[key],
    };
  }
</script>

<ChatView
  bind:input
  bind:showModelSelector
  messages={chat.messages}
  {isLoading}
  {error}
  {selectedModel}
  {availableModels}
  {expandedToolCalls}
  onSubmit={handleSubmit}
  onModelChange={handleModelChange}
  onToggleToolCall={toggleToolCall}
/>
