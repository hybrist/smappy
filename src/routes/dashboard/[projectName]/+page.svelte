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
            <p class="stat-value">{formatBytes(analysis.totalSize ?? 0)}</p>
            <p class="stat-label">Gzip: {formatBytes(analysis.totalGzipSize ?? 0)}</p>
          </div>
          <div class="stat-card">
            <h3>Modules</h3>
            <p class="stat-value">{analysis.moduleCount ?? 0}</p>
            <p class="stat-label">Bundles: {analysis.bundleCount ?? 0}</p>
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
    margin: 0 auto;
    width: 100%;
    max-width: 80rem;
    padding: 1.5rem 1rem;
  }

  .dashboard-header {
    margin-bottom: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  @media (min-width: 640px) {
    .dashboard-header {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }
  }

  .dashboard-content {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .stats-section {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  @media (min-width: 640px) {
    .stats-section {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (min-width: 1024px) {
    .stats-section {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  .stat-card {
    border-radius: 0.5rem;
    border: 1px solid #e5e7eb;
    background-color: #ffffff;
    padding: 1.5rem;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  }

  @media (prefers-color-scheme: dark) {
    .stat-card {
      border-color: #374151;
      background-color: #1f2937;
    }
  }

  .stat-card h3 {
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: #6b7280;
  }

  @media (prefers-color-scheme: dark) {
    .stat-card h3 {
      color: #9ca3af;
    }
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: bold;
    color: #111827;
  }

  @media (prefers-color-scheme: dark) {
    .stat-value {
      color: #ffffff;
    }
  }

  .stat-label {
    margin-top: 0.25rem;
    font-size: 0.875rem;
    color: #4b5563;
  }

  @media (prefers-color-scheme: dark) {
    .stat-label {
      color: #d1d5db;
    }
  }

  .empty-state {
    border-radius: 0.5rem;
    border: 1px solid #e5e7eb;
    background-color: #ffffff;
    padding: 2rem;
    text-align: center;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  }

  @media (prefers-color-scheme: dark) {
    .empty-state {
      border-color: #374151;
      background-color: #1f2937;
    }
  }

  .empty-state p {
    color: #4b5563;
  }

  @media (prefers-color-scheme: dark) {
    .empty-state p {
      color: #9ca3af;
    }
  }
</style>
