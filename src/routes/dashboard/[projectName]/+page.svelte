<script lang="ts">
  import { page } from '$app/stores';
  import ProjectSelector from './ProjectSelector.svelte';
  import AnalysisSelector from './AnalysisSelector.svelte';
  import DashboardLayout from './DashboardLayout.svelte';

  let { data } = $props();

  const projectName = $derived($page.params.projectName);
  const selectedAnalysisId = $derived(data.selectedAnalysisId);
  const analysis = $derived(data.analysis);
  const analysisHistory = $derived(data.analysisHistory);
  const projects = $derived(data.projects);

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
</script>

<DashboardLayout>
  <div class="dashboard-container">
    <div class="dashboard-header">
      <ProjectSelector {projects} {projectName} />
      {#if projectName}
        <AnalysisSelector {projectName} {analysisHistory} {selectedAnalysisId} />
      {/if}
    </div>

    {#if analysis}
      <div class="dashboard-content">
        <section class="stats-section" aria-label="Analysis statistics">
          <div class="stat-card">
            <h3>Total Size</h3>
            <p class="stat-value">{formatBytes(analysis.totalSize)}</p>
            <p class="stat-label">Gzip: {formatBytes(analysis.totalGzipSize)}</p>
          </div>
          <div class="stat-card">
            <h3>Modules</h3>
            <p class="stat-value">{analysis.totalModules}</p>
            <p class="stat-label">Third-party: {analysis.thirdPartyModules}</p>
          </div>
          <div class="stat-card">
            <h3>Bundles</h3>
            <p class="stat-value">{analysis.bundlesCount}</p>
            <p class="stat-label">Chunks: {analysis.chunksCount}</p>
          </div>
          <div class="stat-card">
            <h3>Bundler</h3>
            <p class="stat-value">{analysis.bundler || 'Unknown'}</p>
            <p class="stat-label">
              {new Date(analysis.createdAt).toLocaleDateString()}
            </p>
          </div>
        </section>
      </div>
    {:else if projectName}
      <div class="empty-state" role="alert">
        <p>No analysis data found for project "{projectName}"</p>
      </div>
    {/if}
  </div>
</DashboardLayout>

<style>
  .dashboard-container {
    @apply mx-auto w-full max-w-7xl px-4 py-6;
  }

  .dashboard-header {
    @apply mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between;
  }

  .dashboard-content {
    @apply space-y-6;
  }

  .stats-section {
    @apply grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4;
  }

  .stat-card {
    @apply rounded-lg border border-gray-200 bg-white p-6 shadow dark:border-gray-700 dark:bg-gray-800;
  }

  .stat-card h3 {
    @apply mb-2 text-sm font-medium text-gray-500 dark:text-gray-400;
  }

  .stat-value {
    @apply text-2xl font-bold text-gray-900 dark:text-white;
  }

  .stat-label {
    @apply mt-1 text-sm text-gray-600 dark:text-gray-300;
  }

  .empty-state {
    @apply rounded-lg border border-gray-200 bg-white p-8 text-center shadow dark:border-gray-700 dark:bg-gray-800;
  }

  .empty-state p {
    @apply text-gray-600 dark:text-gray-400;
  }
</style>
