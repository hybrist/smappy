<script lang="ts">
  import { goto } from '$app/navigation';

  let { projectName, analysisHistory, selectedAnalysisId } = $props();

  // eslint-disable-next-line svelte/no-navigation-without-resolve
  function handleAnalysisChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const analysisId = target.value;
    if (analysisId) {
      goto(
        `/dashboard/${encodeURIComponent(projectName)}?analysisId=${encodeURIComponent(analysisId)}`,
      );
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
</script>

<div class="analysis-selector">
  <label for="analysis-select" class="sr-only">Select Analysis Run</label>
  <select
    id="analysis-select"
    value={selectedAnalysisId?.toString() || ''}
    onchange={handleAnalysisChange}
    class="analysis-select"
    aria-label="Select Analysis Run"
  >
    {#each analysisHistory as run (run.id)}
      <option value={run.id.toString()} selected={run.id === selectedAnalysisId}>
        {formatDate(run.createdAt)} - {run.totalModules} modules, {formatBytes(run.totalSize)}
      </option>
    {/each}
  </select>
</div>

<style>
  .analysis-selector {
    flex: 1;
  }

  .analysis-select {
    width: 100%;
    border-radius: 0.5rem;
    border: 1px solid #d1d5db;
    background-color: #ffffff;
    padding: 0.5rem 1rem;
    color: #111827;
    outline: none;
  }

  .analysis-select:focus {
    border-color: transparent;
    ring: 2px;
    ring-color: #3b82f6;
  }

  @media (prefers-color-scheme: dark) {
    .analysis-select {
      border-color: #4b5563;
      background-color: #1f2937;
      color: #ffffff;
    }
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }
</style>
