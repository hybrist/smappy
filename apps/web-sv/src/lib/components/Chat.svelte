<script lang="ts">
  import type { AnalysisSummary } from '$lib/server/query/types';
  import { chatStreamEventSchema } from '$lib/chat/stream-schema';
  import * as v from 'valibot';
  import ChatView from './ChatView.svelte';

  interface ToolCall {
    toolCallId: string;
    toolName: string;
    input: unknown;
    output?: unknown;
  }

  import type { ChatMessage } from '$lib/chat/request-schema';

  type Message = ChatMessage & {
    toolCalls?: ToolCall[];
  };

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
  let messages = $state<Message[]>([]);
  let input = $state('');
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  let expandedToolCalls = $state<Record<string, boolean>>({});

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
          messages: messages.map(({ role, content }) => ({ role, content })),
          model: selectedModel,
          context: {
            projectName,
            analysis,
          },
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
      messages = [...messages, { role: 'assistant', content: '', toolCalls: [] }];

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const event of events) {
          if (!event.startsWith('data: ')) continue;
          const data = JSON.parse(event.slice(6));
          handleStreamEvent(data);
        }
      }
    } catch (err) {
      console.error('Chat error:', err);
      error = err instanceof Error ? err.message : 'An error occurred';
      if (messages[messages.length - 1]?.content === '') {
        messages = messages.slice(0, -1);
      }
    } finally {
      isLoading = false;
    }
  }

  function handleStreamEvent(raw: unknown) {
    const parsed = v.safeParse(chatStreamEventSchema, raw);
    if (!parsed.success) {
      console.warn('Chat stream parse error', parsed.issues);
      return;
    }

    const data = parsed.output;

    switch (data.type) {
      case 'text': {
        const updated = [...messages];
        const last = updated[updated.length - 1];
        if (last && last.role === 'assistant') {
          updated[updated.length - 1] = {
            ...last,
            content: `${last.content}${data.content ?? ''}`,
          };
          messages = updated;
        }
        break;
      }
      case 'tool-call': {
        const updated = [...messages];
        const last = updated[updated.length - 1];
        if (last && last.role === 'assistant') {
          const toolCalls = last.toolCalls ? [...last.toolCalls] : [];
          toolCalls.push({
            toolCallId: data.toolCallId,
            toolName: data.toolName,
            input: data.input,
          });
          updated[updated.length - 1] = { ...last, toolCalls };
          messages = updated;
        }
        break;
      }
      case 'tool-result': {
        const updated = [...messages];
        const last = updated[updated.length - 1];
        if (last && last.role === 'assistant' && last.toolCalls) {
          const toolCalls = last.toolCalls.map((toolCall) =>
            toolCall.toolCallId === data.toolCallId
              ? { ...toolCall, output: data.output }
              : toolCall,
          );
          updated[updated.length - 1] = { ...last, toolCalls };
          messages = updated;
        }
        break;
      }
      case 'error':
        error = data.error ?? 'Stream error';
        break;
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
  {messages}
  {isLoading}
  {error}
  {selectedModel}
  {availableModels}
  {expandedToolCalls}
  onSubmit={handleSubmit}
  onModelChange={handleModelChange}
  onToggleToolCall={toggleToolCall}
/>
