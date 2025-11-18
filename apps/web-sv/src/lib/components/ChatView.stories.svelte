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

<script>
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
    { role: 'user', content: 'Hello, who are you?' },
    {
      role: 'assistant',
      content: 'I am a large language model, trained by Google. What can I do for you today?',
    },
    { role: 'user', content: 'Can you help me with some code?' },
  ];

  const toolCallMessages = [
    ...messages,
    {
      role: 'assistant',
      content: 'I can help with that. I will call a tool to get the file content first.',
      toolCalls: [
        {
          toolCallId: '123',
          toolName: 'readFile',
          input: { path: './src/main.ts' },
        },
        {
          toolCallId: '456',
          toolName: 'writeFile',
          input: { path: './src/main.ts', content: 'console.log("hello world")' },
          output: { success: true },
        },
      ],
    },
  ];
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
