<script lang="ts">
  import DashboardLayout from '../DashboardLayout.svelte';
  import ProjectSelector from '../ProjectSelector.svelte';
  import AnalysisSelector from '../AnalysisSelector.svelte';
  import DependencyGraphVisualization from './DependencyGraphVisualization.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import StatCard from '$lib/components/ui/StatCard.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import CelebrationBanner from '$lib/components/animations/CelebrationBanner.svelte';
  import type { DependencyGraph } from '$lib/server/query/types.js';
  import type { DependencyCycleAnalysis } from '$lib/utils/dependency-graph.js';

  let { data } = $props();

  const projectName = $derived(data.projectName);
  const projects = $derived(data.projects);
  const analysisHistory = $derived(data.analysisHistory);
  const selectedAnalysisId = $derived(data.selectedAnalysisId);
  const analysis = $derived(data.analysis);
  const dependencyGraph = $derived(data.dependencyGraph as DependencyGraph | null);
  const cycleAnalysis = $derived(data.cycleAnalysis as DependencyCycleAnalysis | null);
  const graphStats = $derived(
    data.graphStats as {
      nodeCount: number;
      edgeCount: number;
      cycleCount: number;
      circularModuleCount: number;
    } | null,
  );

  // Celebration for zero circular dependencies
  let showCelebration = $state(false);

  $effect(() => {
    if (graphStats && graphStats.cycleCount === 0 && graphStats.nodeCount > 0) {
      showCelebration = true;
    }
  });

  const nodeLookup = $derived(
    dependencyGraph
      ? (Object.fromEntries(
          dependencyGraph.nodes.map((node) => [node.id, node] as const),
        ) as Record<number, DependencyGraph['nodes'][number]>)
      : ({} as Record<number, DependencyGraph['nodes'][number]>),
  );

  const cycleDetails = $derived(
    dependencyGraph && cycleAnalysis
      ? cycleAnalysis.cycles.map((cycle) => ({
          nodes: cycle.nodes
            .map((id) => nodeLookup[id])
            .filter((node): node is DependencyGraph['nodes'][number] => Boolean(node)),
          edges: cycle.edges,
        }))
      : [],
  );

  function fileName(path: string): string {
    const parts = path.split('/');
    return parts[parts.length - 1] || path;
  }
</script>

<DashboardLayout>
  <CelebrationBanner
    show={showCelebration}
    message="Perfect! Zero circular dependencies detected! 🎯"
    emoji="✨"
    variant="achievement"
    onDismiss={() => (showCelebration = false)}
  />

  <div class="dependencies-container">
    <div class="dependencies-header">
      <ProjectSelector {projects} {projectName} />
      {#if projectName}
        <AnalysisSelector {projectName} {analysisHistory} {selectedAnalysisId} />
      {/if}
    </div>

    {#if analysis && dependencyGraph}
      <PageHeader
        title="Dependency Graph"
        description="Explore how modules relate to each other, identify hotspots, and spot circular dependencies across your bundles."
      />
      {#if graphStats}
        <section class="summary-grid" aria-label="Dependency graph summary">
          <StatCard title="Modules" value={`${graphStats.nodeCount}`} />
          <StatCard title="Imports" value={`${graphStats.edgeCount}`} />
          <StatCard title="Circular groups" value={`${graphStats.cycleCount}`} />
          <StatCard title="Modules in cycles" value={`${graphStats.circularModuleCount}`} />
        </section>
      {/if}

      <DependencyGraphVisualization {cycleAnalysis} graph={dependencyGraph} />

      <section class="cycles-section" aria-label="Circular dependency details">
        <header>
          <h2>Circular Dependencies</h2>
          <p>
            {#if cycleDetails.length > 0}
              {cycleDetails.length} detected circular group{cycleDetails.length === 1 ? '' : 's'}.
              Select a module in the graph to inspect the cycle in detail.
            {:else}
              No circular dependencies detected for this analysis.
            {/if}
          </p>
        </header>

        {#if cycleDetails.length > 0}
          <div class="cycle-list">
            {#each cycleDetails as cycle, index (index)}
              <article class="cycle-card">
                <h3>Cycle {index + 1}</h3>
                <ul>
                  {#each cycle.nodes as node (node.id)}
                    <li>
                      <span class="module-name">{fileName(node.filePath)}</span>
                      <span class="module-path">{node.filePath}</span>
                    </li>
                  {/each}
                </ul>
              </article>
            {/each}
          </div>
        {/if}
      </section>
    {:else if projectName}
      <EmptyState
        title="No analysis data available"
        description="Ingest bundle data for {projectName} to unlock dependency insights."
      />
    {:else}
      <EmptyState
        title="No project selected"
        description="Select a project to view dependency information."
      />
    {/if}
  </div>
</DashboardLayout>

<style>
  .dependencies-container {
    margin: 0 auto;
    width: 100%;
    max-width: 82rem;
    padding: 1.5rem 1rem 3rem;
    display: grid;
    gap: 1.75rem;
  }

  .dependencies-header {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  @media (min-width: 640px) {
    .dependencies-header {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }
  }

  .summary-grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  }

  .cycles-section {
    border-radius: 0.75rem;
    border: 1px solid #e5e7eb;
    padding: 1.75rem;
    background-color: #ffffff;
    display: grid;
    gap: 1.5rem;
  }

  @media (prefers-color-scheme: dark) {
    .cycles-section {
      border-color: #334155;
      background-color: #1f2937;
      color: #e5e7eb;
    }
  }

  .cycles-section header h2 {
    margin: 0;
    font-size: 1.4rem;
    font-weight: 600;
  }

  .cycles-section header p {
    margin: 0.5rem 0 0 0;
    color: #6b7280;
  }

  @media (prefers-color-scheme: dark) {
    .cycles-section header p {
      color: #cbd5f5;
    }
  }

  .cycle-list {
    display: grid;
    gap: 1.25rem;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }

  .cycle-card {
    border-radius: 0.75rem;
    border: 1px solid rgba(239, 68, 68, 0.2);
    background-color: rgba(254, 226, 226, 0.55);
    padding: 1rem;
    display: grid;
    gap: 0.75rem;
  }

  .cycle-card h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #b91c1c;
  }

  .cycle-card ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.5rem;
  }

  .cycle-card li {
    display: grid;
    gap: 0.25rem;
    font-size: 0.85rem;
  }

  .cycle-card .module-name {
    font-weight: 600;
    color: #7f1d1d;
  }

  .cycle-card .module-path {
    word-break: break-all;
    color: #991b1b;
    font-size: 0.75rem;
  }

  @media (prefers-color-scheme: dark) {
    .cycle-card {
      border-color: rgba(248, 113, 113, 0.4);
      background-color: rgba(190, 18, 60, 0.2);
    }

    .cycle-card .module-name {
      color: #fecaca;
    }

    .cycle-card .module-path {
      color: #fde2e2;
    }
  }
</style>
