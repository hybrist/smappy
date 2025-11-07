<script lang="ts">
  import DashboardLayout from '../DashboardLayout.svelte';
  import ProjectSelector from '../ProjectSelector.svelte';
  import AnalysisSelector from '../AnalysisSelector.svelte';
  import DependencyGraphVisualization from './DependencyGraphVisualization.svelte';
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
  <div class="dependencies-container">
    <div class="dependencies-header">
      <ProjectSelector {projects} {projectName} />
      {#if projectName}
        <AnalysisSelector {projectName} {analysisHistory} {selectedAnalysisId} />
      {/if}
    </div>

    {#if analysis && dependencyGraph}
      <section class="summary-section" aria-label="Dependency graph summary">
        <div>
          <h1>Dependency Graph</h1>
          <p>
            Explore how modules relate to each other, identify hotspots, and spot circular
            dependencies across your bundles.
          </p>
        </div>
        {#if graphStats}
          <div class="summary-grid">
            <div class="summary-card">
              <span class="summary-label">Modules</span>
              <span class="summary-value">{graphStats.nodeCount}</span>
            </div>
            <div class="summary-card">
              <span class="summary-label">Imports</span>
              <span class="summary-value">{graphStats.edgeCount}</span>
            </div>
            <div class="summary-card">
              <span class="summary-label">Circular groups</span>
              <span class="summary-value">{graphStats.cycleCount}</span>
            </div>
            <div class="summary-card">
              <span class="summary-label">Modules in cycles</span>
              <span class="summary-value">{graphStats.circularModuleCount}</span>
            </div>
          </div>
        {/if}
      </section>

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
      <div class="empty-state" role="alert">
        <p>
          No analysis data available. Ingest bundle data for <strong>{projectName}</strong> to unlock
          dependency insights.
        </p>
      </div>
    {:else}
      <div class="empty-state" role="alert">
        <p>Select a project to view dependency information.</p>
      </div>
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

  .summary-section {
    display: grid;
    gap: 1.25rem;
    border-radius: 0.75rem;
    border: 1px solid #e5e7eb;
    background-color: #ffffff;
    padding: 1.75rem;
    box-shadow: 0 1px 3px rgb(15 23 42 / 0.08);
  }

  @media (prefers-color-scheme: dark) {
    .summary-section {
      border-color: #334155;
      background-color: #1f2937;
    }
  }

  .summary-section h1 {
    margin: 0;
    font-size: 1.75rem;
    font-weight: 700;
    color: #1f2937;
  }

  @media (prefers-color-scheme: dark) {
    .summary-section h1 {
      color: #f9fafb;
    }
  }

  .summary-section p {
    margin: 0.25rem 0 0 0;
    color: #6b7280;
    max-width: 42rem;
  }

  @media (prefers-color-scheme: dark) {
    .summary-section p {
      color: #d1d5db;
    }
  }

  .summary-grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  }

  .summary-card {
    padding: 1.1rem;
    border-radius: 0.75rem;
    background: linear-gradient(145deg, rgba(37, 99, 235, 0.08), rgba(14, 165, 233, 0.08));
    border: 1px solid rgba(37, 99, 235, 0.15);
  }

  @media (prefers-color-scheme: dark) {
    .summary-card {
      background: linear-gradient(145deg, rgba(37, 99, 235, 0.18), rgba(56, 189, 248, 0.12));
      border-color: rgba(96, 165, 250, 0.3);
    }
  }

  .summary-label {
    display: block;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #2563eb;
  }

  .summary-value {
    display: block;
    font-size: 1.5rem;
    font-weight: 700;
    color: #0f172a;
    margin-top: 0.35rem;
  }

  @media (prefers-color-scheme: dark) {
    .summary-value {
      color: #f8fafc;
    }
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

  .empty-state {
    border-radius: 0.75rem;
    border: 1px solid #e5e7eb;
    padding: 2rem;
    background-color: #ffffff;
    text-align: center;
    color: #6b7280;
    font-size: 0.95rem;
  }

  .empty-state strong {
    color: #1f2937;
  }

  @media (prefers-color-scheme: dark) {
    .empty-state {
      border-color: #334155;
      background-color: #1f2937;
      color: #cbd5f5;
    }

    .empty-state strong {
      color: #f9fafb;
    }
  }
</style>
