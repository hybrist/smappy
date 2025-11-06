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
    @apply flex-1;
  }

  .analysis-select {
    @apply w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white;
  }

  .sr-only {
    @apply sr-only;
  }
</style>
