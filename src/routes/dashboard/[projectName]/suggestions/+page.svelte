<script lang="ts">
  import SuggestionList from '$lib/components/suggestions/SuggestionList.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Suggestions - {data.projectName} | Smappy</title>
</svelte:head>

{#if data.analysis}
  <div class="suggestions-page">
    <div class="page-header">
      <h1 class="page-title">Analysis Suggestions</h1>
      <p class="page-description">
        AI-generated recommendations to optimize your bundle based on analysis of {data.analysis
          .bundler || 'your bundler'}.
      </p>
    </div>
    <SuggestionList suggestions={data.suggestions} projectName={data.projectName} />
  </div>
{:else}
  <div class="empty-analysis">
    <p>No analysis data available for this project.</p>
    <p>Please run an analysis first to see suggestions.</p>
  </div>
{/if}

<style>
  .suggestions-page {
    padding: 1.5rem;
  }

  .page-header {
    margin-bottom: 2rem;
  }

  .page-title {
    font-size: 2rem;
    font-weight: bold;
    color: #111827;
    margin-bottom: 0.5rem;
  }

  @media (prefers-color-scheme: dark) {
    .page-title {
      color: #f9fafb;
    }
  }

  .page-description {
    color: #6b7280;
    font-size: 1rem;
    line-height: 1.5;
  }

  @media (prefers-color-scheme: dark) {
    .page-description {
      color: #9ca3af;
    }
  }

  .empty-analysis {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    padding: 2rem;
    color: #6b7280;
    text-align: center;
  }

  @media (prefers-color-scheme: dark) {
    .empty-analysis {
      color: #9ca3af;
    }
  }

  .empty-analysis p {
    margin-bottom: 0.5rem;
  }
</style>
