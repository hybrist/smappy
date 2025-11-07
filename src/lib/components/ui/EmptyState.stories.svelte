<script context="module">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import EmptyState from './EmptyState.svelte';

  const { Story } = defineMeta({
    title: 'UI/EmptyState',
    component: EmptyState,
    tags: ['autodocs'],
    argTypes: {
      title: {
        control: 'text',
      },
      description: {
        control: 'text',
      },
    },
  });
</script>

<script>
  import Button from './Button.svelte';
</script>

<!--
  @component EmptyState Stories

  Showcases the EmptyState component for different empty scenarios.
-->

<Story name="Basic">
  <EmptyState title="No data available" description="There is currently no data to display." />
</Story>

<Story name="No Suggestions">
  <EmptyState
    title="No suggestions yet"
    description="Run the analyzer to generate optimization suggestions for your bundle."
  >
    {#snippet icon()}
      <svg class="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
        />
      </svg>
    {/snippet}
    {#snippet action()}
      <Button variant="primary">Generate Suggestions</Button>
    {/snippet}
  </EmptyState>
</Story>

<Story name="No Results">
  <EmptyState
    title="No results found"
    description="Try adjusting your search or filter criteria to find what you're looking for."
  >
    {#snippet icon()}
      <svg class="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    {/snippet}
    {#snippet action()}
      <Button variant="secondary">Clear Filters</Button>
    {/snippet}
  </EmptyState>
</Story>

<Story name="Insufficient Data">
  <EmptyState
    title="Insufficient data to compare"
    description="You need at least 2 analysis runs to compare. Run another analysis first."
  >
    {#snippet icon()}
      <svg class="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    {/snippet}
    {#snippet action()}
      <Button variant="primary">Run New Analysis</Button>
    {/snippet}
  </EmptyState>
</Story>

<Story name="No Circular Dependencies">
  <EmptyState
    title="No circular dependencies detected"
    description="Great news! Your codebase doesn't have any circular import dependencies."
  >
    {#snippet icon()}
      <svg class="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    {/snippet}
  </EmptyState>
</Story>

<Story name="No Icon">
  <EmptyState
    title="Empty folder"
    description="This folder doesn't contain any files yet. Upload or create files to get started."
  >
    {#snippet action()}
      <Button variant="primary">Upload Files</Button>
    {/snippet}
  </EmptyState>
</Story>

<Story name="With Link">
  <EmptyState title="No projects" description="Create your first project to get started.">
    {#snippet icon()}
      <svg class="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
        />
      </svg>
    {/snippet}
    {#snippet action()}
      <div class="flex flex-col gap-2">
        <Button variant="primary">New Project</Button>
        <Button variant="link">Learn more →</Button>
      </div>
    {/snippet}
  </EmptyState>
</Story>
