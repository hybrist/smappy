<script lang="ts">
  import DashboardLayout from '../DashboardLayout.svelte';
  import ProjectSelector from '../ProjectSelector.svelte';
  import AnalysisSelector from '../AnalysisSelector.svelte';
  import SuggestionList from '$lib/components/suggestions/SuggestionList.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const projectName = $derived(data.projectName);
  const projects = $derived(data.projects);
  const analysisHistory = $derived(data.analysisHistory);
  const selectedAnalysisId = $derived(data.selectedAnalysisId);
  const analysis = $derived(data.analysis);
  const suggestions = $derived(data.suggestions);
</script>

<svelte:head>
  <title>Suggestions - {data.projectName} | Smappy</title>
</svelte:head>

<DashboardLayout>
  <div class="suggestions-container">
    <div class="suggestions-header">
      <ProjectSelector {projects} {projectName} />
      {#if projectName}
        <AnalysisSelector {projectName} {analysisHistory} {selectedAnalysisId} />
      {/if}
    </div>

    {#if analysis}
      <div class="suggestions-content">
        <PageHeader
          title="Analysis Suggestions"
          description={`AI-generated recommendations to optimize your bundle based on analysis of ${analysis.bundler || 'your latest run'}.`}
        />
        <SuggestionList {suggestions} {projectName} />
      </div>
    {:else if projectName}
      <div class="suggestions-empty">
        <EmptyState
          title="No analysis data available"
          description={`Run an analysis for "${projectName}" to generate actionable suggestions.`}
        />
      </div>
    {/if}
  </div>
</DashboardLayout>

<style>
  .suggestions-container {
    margin: 0 auto;
    width: 100%;
    max-width: 80rem;
    padding: 1.5rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .suggestions-header {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  @media (min-width: 640px) {
    .suggestions-header {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }
  }

  .suggestions-content {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .suggestions-empty {
    border: 1px dashed #d1d5db;
    border-radius: 0.75rem;
    padding: 1.5rem;
  }

  @media (prefers-color-scheme: dark) {
    .suggestions-empty {
      border-color: #374151;
    }
  }
</style>
