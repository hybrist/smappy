<script lang="ts">
  import { page } from '$app/stores';
  import ProjectSelector from './ProjectSelector.svelte';
  import AnalysisSelector from './AnalysisSelector.svelte';
  import DashboardLayout from './DashboardLayout.svelte';
  import BundleOverview from './BundleOverview.svelte';
  import StatCard from '$lib/components/ui/StatCard.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';

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
          <StatCard
            title="Total Size"
            value={formatBytes(analysis.totalSize ?? 0)}
            subtitle="Gzip: {formatBytes(analysis.totalGzipSize ?? 0)}"
          />
          <StatCard
            title="Modules"
            value={`${analysis.moduleCount ?? 0}`}
            subtitle="Bundles: {analysis.bundleCount ?? 0}"
          />
          <StatCard
            title="Bundler"
            value={analysis.bundler || 'Unknown'}
            subtitle={new Date(analysis.createdAt).toLocaleDateString()}
          />
        </section>

        <BundleOverview
          bundleBreakdown={data.bundleBreakdown || {}}
          chunks={data.chunks || []}
          topModules={data.topModules || []}
          analysisId={analysis.id}
        />
      </div>
    {:else if projectName}
      <EmptyState
        title="No analysis data found"
        description='No analysis data found for project "{projectName}". Please run an analysis to view bundle insights.'
      />
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
      grid-template-columns: repeat(3, 1fr);
    }
  }
</style>
