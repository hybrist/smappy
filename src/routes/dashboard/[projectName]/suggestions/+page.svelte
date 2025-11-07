<script lang="ts">
  import SuggestionList from '$lib/components/suggestions/SuggestionList.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Suggestions - {data.projectName} | Smappy</title>
</svelte:head>

{#if data.analysis}
  <div class="suggestions-page">
    <PageHeader
      title="Analysis Suggestions"
      description="AI-generated recommendations to optimize your bundle based on analysis of {data
        .analysis.bundler || 'your bundler'}."
    />
    <SuggestionList suggestions={data.suggestions} projectName={data.projectName} />
  </div>
{:else}
  <EmptyState
    title="No analysis data available"
    description="Please run an analysis first to see suggestions for this project."
  />
{/if}

<style>
  .suggestions-page {
    padding: 1.5rem;
  }
</style>
