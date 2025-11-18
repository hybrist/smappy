<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { action } from 'storybook/actions';
  import ChatView from './ChatView.svelte';

  const { Story } = defineMeta({
    title: 'components/ChatView',
    component: ChatView,
    tags: ['autodocs'],
    argTypes: {
      messages: { control: 'object' },
      input: { control: 'text' },
      isLoading: { control: 'boolean' },
      error: { control: 'text' },
      selectedModel: { control: 'text' },
      availableModels: { control: 'object' },
      showModelSelector: { control: 'boolean' },
      expandedToolCalls: { control: 'object' },
    },
  });
</script>

<script lang="ts">
  import type { UIMessage } from 'ai';
  const baseArgs = {
    input: '',
    isLoading: false,
    error: null,
    selectedModel: 'gpt-oss',
    availableModels: ['gpt-oss', 'qwen2.5-coder:3b', 'llama3.2:3b'],
    showModelSelector: false,
    expandedToolCalls: {},
    onSubmit: action('onSubmit'),
    onModelChange: action('onModelChange'),
    onToggleToolCall: action('onToggleToolCall'),
  };

  const messages = [
    {
      id: '1',
      role: 'user',
      parts: [{ type: 'text', text: 'Hello, who are you?' }],
    },
    {
      id: '2',
      role: 'assistant',
      parts: [
        {
          type: 'text',
          text: 'I am a large language model, trained by Google. What can I do for you today?',
        },
      ],
    },
    {
      id: '3',
      role: 'user',
      parts: [{ type: 'text', text: 'Can you help me with some code?' }],
    },
  ] satisfies UIMessage[];

  const toolCallMessages = [
    ...messages,
    {
      id: '4',
      role: 'assistant',
      parts: [
        {
          type: 'text',
          text: 'I can help with that. I will call a tool to get the file content first.',
        },
        {
          type: 'tool-readFile',
          toolCallId: '123',
          state: 'output-available',
          input: { path: './src/main.ts' },
          output: { content: '/* main.ts content */' },
        },
        {
          type: 'tool-writeFile',
          toolCallId: '456',
          state: 'output-available',
          input: { path: './src/main.ts', content: 'console.log("hello world")' },
          output: { success: true },
        },
      ],
    },
  ] satisfies UIMessage[];
</script>

<Story name="Empty" args={{ ...baseArgs, messages: [] }} />

<Story
  name="With Messages"
  args={{ ...baseArgs, messages: messages, input: 'Here is my code...' }}
/>

<Story name="Loading" args={{ ...baseArgs, messages: messages, isLoading: true }} />

<Story
  name="Error"
  args={{ ...baseArgs, messages: messages, error: 'Something went wrong. Please try again.' }}
/>

<Story
  name="With Tool Calls"
  args={{
    ...baseArgs,
    messages: toolCallMessages,
  }}
/>

<Story
  name="With Tool Calls Expanded"
  args={{
    ...baseArgs,
    messages: toolCallMessages,
    expandedToolCalls: { '3-0': true, '3-1': true },
  }}
/>

<Story
  name="Model Selector Open"
  args={{
    ...baseArgs,
    messages: messages,
    showModelSelector: true,
  }}
/>
