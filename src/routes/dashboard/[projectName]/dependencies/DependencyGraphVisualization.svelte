<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import * as d3 from 'd3';
  import type { DependencyGraph } from '$lib/server/query/types.js';
  import type { DependencyCycleAnalysis } from '$lib/utils/dependency-graph.js';

  interface Props {
    graph: DependencyGraph;
    cycleAnalysis: DependencyCycleAnalysis | null;
  }

  interface GraphNodeDatum extends d3.SimulationNodeDatum {
    id: number;
    filePath: string;
    bundledSize: number;
    isThirdParty: boolean;
    packageName: string | null;
  }

  interface GraphLinkDatum extends d3.SimulationLinkDatum<GraphNodeDatum> {
    from: number;
    to: number;
    importType: string;
    importedSymbols: string[] | null;
  }

  let { graph, cycleAnalysis }: Props = $props();

  let svgElement: SVGSVGElement;
  let containerElement: HTMLDivElement;

  let simulation: d3.Simulation<GraphNodeDatum, GraphLinkDatum>;
  let zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown>;

  let nodeSelection: d3.Selection<SVGGElement, GraphNodeDatum, SVGGElement | null, unknown>;
  let linkSelection: d3.Selection<SVGLineElement, GraphLinkDatum, SVGGElement | null, unknown>;
  let labelSelection: d3.Selection<SVGTextElement, GraphNodeDatum, SVGGElement | null, unknown>;

  let isInitialized = false;
  let width = 960;
  let height = 640;

  let selectedNodeId: number | null = null;
  let hoveredEdge: { from: number; to: number } | null = null;

  let searchTerm = $state('');
  let includeFirstParty = $state(true);
  let includeThirdParty = $state(true);
  let importTypeFilter = $state<'all' | 'static' | 'dynamic'>('all');
  let minimumSize = $state(0);

  const colorSource = '#2563eb';
  const colorThirdParty = '#f97316';
  const colorEdgeStatic = '#94a3b8';
  const colorEdgeDynamic = '#34d399';

  const nodePositions: Record<number, { x: number; y: number }> = {};

  const nodeIndex = $derived(
    Object.fromEntries(graph.nodes.map((node) => [node.id, node] as const)) as Record<
      number,
      DependencyGraph['nodes'][number]
    >,
  );

  const cycleNodeSet = $derived(new Set(cycleAnalysis?.cycleNodeIds ?? []));
  const cycleEdgeSet = $derived(new Set(cycleAnalysis?.cycleEdgeKeys ?? []));

  const allSizes = $derived(graph.nodes.map((node) => node.bundledSize));
  const maxSize = $derived(allSizes.length > 0 ? Math.max(...allSizes, 1) : 1);

  const filteredNodes = $derived(
    graph.nodes.filter((node) => {
      const lowerSearch = searchTerm.trim().toLowerCase();
      if (!includeFirstParty && !node.isThirdParty) return false;
      if (!includeThirdParty && node.isThirdParty) return false;
      if (minimumSize > 0 && node.bundledSize < minimumSize) return false;
      if (lowerSearch && !node.filePath.toLowerCase().includes(lowerSearch)) return false;
      return true;
    }),
  );

  const filteredNodeIds = $derived(new Set(filteredNodes.map((node) => node.id)));

  const filteredEdges = $derived(
    graph.edges.filter((edge) => {
      if (!filteredNodeIds.has(edge.from) || !filteredNodeIds.has(edge.to)) {
        return false;
      }
      if (importTypeFilter !== 'all' && edge.importType !== importTypeFilter) {
        return false;
      }
      return true;
    }),
  );

  $effect(() => {
    if (selectedNodeId != null && !filteredNodeIds.has(selectedNodeId)) {
      selectedNodeId = null;
    }
  });

  const selectedNode = $derived(
    selectedNodeId != null ? (nodeIndex[selectedNodeId] ?? null) : null,
  );

  const selectedNodeDependencies = $derived(
    selectedNode
      ? {
          imports: graph.edges
            .filter((edge) => edge.from === selectedNode.id)
            .map((edge) => ({
              edge,
              node: nodeIndex[edge.to],
            }))
            .filter(
              (
                item,
              ): item is {
                edge: DependencyGraph['edges'][number];
                node: DependencyGraph['nodes'][number];
              } => Boolean(item.node),
            ),
          dependents: graph.edges
            .filter((edge) => edge.to === selectedNode.id)
            .map((edge) => ({
              edge,
              node: nodeIndex[edge.from],
            }))
            .filter(
              (
                item,
              ): item is {
                edge: DependencyGraph['edges'][number];
                node: DependencyGraph['nodes'][number];
              } => Boolean(item.node),
            ),
        }
      : { imports: [], dependents: [] },
  );

  function formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const size = bytes / Math.pow(1024, exponent);
    return `${size.toFixed(size >= 100 ? 0 : size >= 10 ? 1 : 2)} ${units[exponent]}`;
  }

  function fileName(path: string): string {
    const parts = path.split('/');
    return parts[parts.length - 1] || path;
  }

  function updateDimensions() {
    if (!containerElement) return;
    const rect = containerElement.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    if (simulation) {
      simulation.force('center', d3.forceCenter(width / 2, height / 2));
      simulation.alpha(0.3).restart();
    }
  }

  let resizeObserver: ResizeObserver;

  onMount(() => {
    if (!svgElement) return;

    simulation = d3
      .forceSimulation<GraphNodeDatum>()
      .force('charge', d3.forceManyBody<GraphNodeDatum>().strength(-220).distanceMax(500))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force(
        'collision',
        d3
          .forceCollide<GraphNodeDatum>()
          .radius((node) => 20 + Math.sqrt(node.bundledSize || 0) / 2),
      );

    const rootGroup = d3.select(svgElement).append('g').attr('class', 'graph-root');
    linkSelection = rootGroup
      .append('g')
      .attr('class', 'links')
      .selectAll<SVGLineElement, GraphLinkDatum>('line');
    nodeSelection = rootGroup
      .append('g')
      .attr('class', 'nodes')
      .selectAll<SVGGElement, GraphNodeDatum>('g');
    labelSelection = rootGroup
      .append('g')
      .attr('class', 'labels')
      .selectAll<SVGTextElement, GraphNodeDatum>('text');

    zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        rootGroup.attr('transform', event.transform.toString());
      });

    d3.select(svgElement).call(zoomBehavior as never);

    d3.select(svgElement).on('click', () => {
      selectedNodeId = null;
    });

    simulation.on('tick', () => {
      linkSelection
        .attr('x1', (d) => (typeof d.source === 'object' ? (d.source.x ?? 0) : 0))
        .attr('y1', (d) => (typeof d.source === 'object' ? (d.source.y ?? 0) : 0))
        .attr('x2', (d) => (typeof d.target === 'object' ? (d.target.x ?? 0) : 0))
        .attr('y2', (d) => (typeof d.target === 'object' ? (d.target.y ?? 0) : 0));

      nodeSelection.attr('transform', (d) => {
        const x = d.x ?? width / 2;
        const y = d.y ?? height / 2;
        nodePositions[d.id] = { x, y };
        return `translate(${x}, ${y})`;
      });

      labelSelection.attr('x', (d) => d.x ?? width / 2).attr('y', (d) => (d.y ?? height / 2) - 20);
    });

    resizeObserver = new ResizeObserver(() => updateDimensions());
    if (containerElement) {
      resizeObserver.observe(containerElement);
    }

    updateDimensions();
    isInitialized = true;
  });

  onDestroy(() => {
    if (resizeObserver && containerElement) {
      resizeObserver.unobserve(containerElement);
    }
    simulation?.stop();
  });

  function applyDragBehaviour(
    selection: d3.Selection<SVGGElement, GraphNodeDatum, SVGGElement | null, unknown>,
  ) {
    const dragBehaviour = d3
      .drag<SVGGElement, GraphNodeDatum>()
      .on('start', (event, datum) => {
        event.sourceEvent.stopPropagation();
        if (!event.active) simulation.alphaTarget(0.3).restart();
        datum.fx = datum.x;
        datum.fy = datum.y;
      })
      .on('drag', (event, datum) => {
        datum.fx = event.x;
        datum.fy = event.y;
      })
      .on('end', (event, datum) => {
        if (!event.active) simulation.alphaTarget(0);
        datum.fx = null;
        datum.fy = null;
      });

    selection.call(dragBehaviour);
  }

  function nodeFill(node: GraphNodeDatum): string {
    if (cycleNodeSet.has(node.id)) {
      return '#ef4444';
    }
    return node.isThirdParty ? colorThirdParty : colorSource;
  }

  function edgeStroke(edge: GraphLinkDatum): string {
    return edge.importType === 'dynamic' ? colorEdgeDynamic : colorEdgeStatic;
  }

  function edgeDash(edge: GraphLinkDatum): string | null {
    return edge.importType === 'dynamic' ? '4 4' : null;
  }

  $effect(() => {
    if (!isInitialized || !simulation) return;

    const nodes: GraphNodeDatum[] = filteredNodes.map((node) => {
      const storedPosition = nodePositions[node.id];
      return {
        ...node,
        x: storedPosition?.x ?? width / 2,
        y: storedPosition?.y ?? height / 2,
      };
    });

    const links: GraphLinkDatum[] = filteredEdges.map((edge) => ({
      ...edge,
    }));

    simulation.nodes(nodes);
    simulation.force(
      'link',
      d3
        .forceLink<GraphNodeDatum, GraphLinkDatum>(links)
        .id((node) => node.id)
        .distance((edge) => (edge.importType === 'dynamic' ? 140 : 80))
        .strength(0.25),
    );

    linkSelection = linkSelection.data(
      links,
      (edge: GraphLinkDatum) => `${edge.from}:${edge.to}:${edge.importType}`,
    );

    linkSelection.exit().remove();
    const linkEnter = linkSelection
      .enter()
      .append('line')
      .attr('class', 'graph-link')
      .attr('stroke-width', 1.5)
      .on('mouseenter', (_event, datum) => {
        hoveredEdge = { from: datum.from, to: datum.to };
      })
      .on('mouseleave', () => {
        hoveredEdge = null;
      });

    linkSelection = linkEnter.merge(linkSelection as never);

    linkSelection
      .attr('stroke', (edge) => edgeStroke(edge))
      .attr('stroke-dasharray', (edge) => edgeDash(edge) ?? null)
      .classed('cycle-edge', (edge) => cycleEdgeSet.has(`${edge.from}:${edge.to}`));

    nodeSelection = nodeSelection.data(nodes, (node: GraphNodeDatum) => node.id);
    nodeSelection.exit().remove();

    const nodeEnter = nodeSelection
      .enter()
      .append('g')
      .attr('class', 'graph-node')
      .on('click', (event, datum) => {
        event.stopPropagation();
        selectedNodeId = datum.id;
      });

    nodeEnter
      .append('circle')
      .attr('r', 18)
      .attr('fill', (node) => nodeFill(node))
      .attr('stroke', '#0f172a')
      .attr('stroke-width', 1.5);

    nodeEnter.append('title').text((node) => node.filePath);

    applyDragBehaviour(nodeEnter);

    nodeSelection = nodeEnter.merge(nodeSelection as never);

    nodeSelection
      .select('circle')
      .attr('fill', (node) => nodeFill(node))
      .classed('selected', (node) => selectedNodeId === node.id)
      .classed('cycle-node', (node) => cycleNodeSet.has(node.id));

    labelSelection = labelSelection.data(nodes, (node: GraphNodeDatum) => node.id);
    labelSelection.exit().remove();

    const labelEnter = labelSelection
      .enter()
      .append('text')
      .attr('class', 'node-label')
      .attr('text-anchor', 'middle')
      .attr('dy', -26);

    labelSelection = labelEnter.merge(labelSelection as never);
    labelSelection.text((node) => fileName(node.filePath));

    simulation.alpha(0.9).restart();
  });

  const hoveredEdgeInfo = $derived(
    (() => {
      if (!hoveredEdge) return null;
      const source = nodeIndex[hoveredEdge.from];
      const target = nodeIndex[hoveredEdge.to];
      if (!source || !target) return null;
      return {
        source,
        target,
        edge: graph.edges.find(
          (edge) => edge.from === hoveredEdge.from && edge.to === hoveredEdge.to,
        ),
      };
    })(),
  );

  function resetView() {
    if (!svgElement || !zoomBehavior) return;
    d3.select(svgElement).transition().duration(300).call(zoomBehavior.transform, d3.zoomIdentity);
  }
</script>

<div class="graph-controls" role="toolbar" aria-label="Dependency graph filters">
  <div class="control-group">
    <label for="dep-search">Search</label>
    <input
      id="dep-search"
      type="search"
      placeholder="Search modules..."
      bind:value={searchTerm}
      class="control-input"
    />
  </div>

  <div class="control-group">
    <span class="control-label">Source</span>
    <label class="checkbox">
      <input type="checkbox" bind:checked={includeFirstParty} />
      <span>First-party</span>
    </label>
    <label class="checkbox">
      <input type="checkbox" bind:checked={includeThirdParty} />
      <span>Third-party</span>
    </label>
  </div>

  <div class="control-group">
    <label for="import-type-select">Import Type</label>
    <select id="import-type-select" bind:value={importTypeFilter} class="control-input">
      <option value="all">All imports</option>
      <option value="static">Static</option>
      <option value="dynamic">Dynamic</option>
    </select>
  </div>

  <div class="control-group control-range">
    <label for="size-slider">
      Minimum size ({formatBytes(minimumSize)})
    </label>
    <input
      id="size-slider"
      type="range"
      min="0"
      max={Math.max(maxSize, 1)}
      step={Math.max(Math.round(maxSize / 100), 1)}
      bind:value={minimumSize}
    />
  </div>

  <button type="button" class="control-button" onclick={resetView}>Reset View</button>
</div>

<div class="graph-layout">
  <div class="graph-canvas" bind:this={containerElement} aria-live="polite">
    <svg
      bind:this={svgElement}
      width="100%"
      height="100%"
      role="img"
      aria-label="Dependency graph visualization"
    ></svg>
    {#if filteredNodes.length === 0}
      <div class="empty-overlay">
        <p>No modules match the current filters.</p>
      </div>
    {/if}
  </div>

  <aside class="graph-sidebar" aria-live="polite">
    {#if selectedNode}
      <h2 class="sidebar-title">{fileName(selectedNode.filePath)}</h2>
      <p class="sidebar-path">{selectedNode.filePath}</p>
      <div class="sidebar-stat-grid">
        <div>
          <span class="stat-label">Bundled Size</span>
          <span class="stat-value">{formatBytes(selectedNode.bundledSize)}</span>
        </div>
        <div>
          <span class="stat-label">Package</span>
          <span class="stat-value">{selectedNode.packageName ?? 'Source'}</span>
        </div>
      </div>

      <section class="sidebar-section">
        <h3>Imports ({selectedNodeDependencies.imports.length})</h3>
        {#if selectedNodeDependencies.imports.length === 0}
          <p class="empty-state">No imports.</p>
        {:else}
          <ul>
            {#each selectedNodeDependencies.imports as item (item.node.id)}
              <li>
                <span class="module-name">{fileName(item.node.filePath)}</span>
                <span class="module-path">{item.node.filePath}</span>
                <span class="module-meta">
                  {item.edge.importType === 'dynamic' ? 'Dynamic import' : 'Static import'}
                  {#if item.edge.importedSymbols && item.edge.importedSymbols.length > 0}
                    • Symbols: {item.edge.importedSymbols.join(', ')}
                  {/if}
                </span>
              </li>
            {/each}
          </ul>
        {/if}
      </section>

      <section class="sidebar-section">
        <h3>Dependents ({selectedNodeDependencies.dependents.length})</h3>
        {#if selectedNodeDependencies.dependents.length === 0}
          <p class="empty-state">No modules depend on this module.</p>
        {:else}
          <ul>
            {#each selectedNodeDependencies.dependents as item (item.node.id)}
              <li>
                <span class="module-name">{fileName(item.node.filePath)}</span>
                <span class="module-path">{item.node.filePath}</span>
                <span class="module-meta">
                  {item.edge.importType === 'dynamic' ? 'Dynamic import' : 'Static import'}
                  {#if item.edge.importedSymbols && item.edge.importedSymbols.length > 0}
                    • Symbols: {item.edge.importedSymbols.join(', ')}
                  {/if}
                </span>
              </li>
            {/each}
          </ul>
        {/if}
      </section>
    {:else if hoveredEdgeInfo}
      <h2 class="sidebar-title">Import Details</h2>
      <p class="sidebar-path">
        {fileName(hoveredEdgeInfo.source.filePath)} → {fileName(hoveredEdgeInfo.target.filePath)}
      </p>
      <div class="sidebar-section">
        <p>
          {hoveredEdgeInfo.edge?.importType === 'dynamic' ? 'Dynamic import' : 'Static import'} between
          <br />
          <span class="module-path">{hoveredEdgeInfo.source.filePath}</span>
          <br />
          and
          <br />
          <span class="module-path">{hoveredEdgeInfo.target.filePath}</span>
        </p>
        {#if hoveredEdgeInfo.edge?.importedSymbols && hoveredEdgeInfo.edge.importedSymbols.length > 0}
          <p>Symbols: {hoveredEdgeInfo.edge.importedSymbols.join(', ')}</p>
        {/if}
      </div>
    {:else}
      <div class="sidebar-empty">
        <h2>Select a module</h2>
        <p>Click on any node in the graph to view its imports and dependents.</p>
        <p>
          Nodes marked in red are part of circular dependencies. Use filters to focus on areas of
          the graph.
        </p>
      </div>
    {/if}
  </aside>
</div>

<style>
  :global(svg.graph) {
    background-color: transparent;
  }

  .graph-controls {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: flex-end;
    padding: 1rem;
    margin-bottom: 1rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.75rem;
    background-color: #ffffff;
    box-shadow: 0 1px 2px rgb(15 23 42 / 0.06);
  }

  @media (prefers-color-scheme: dark) {
    .graph-controls {
      border-color: #334155;
      background-color: #1f2937;
    }
  }

  .control-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .control-group span.control-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: #6b7280;
  }

  .control-input {
    padding: 0.45rem 0.75rem;
    border-radius: 0.5rem;
    border: 1px solid #d1d5db;
    font-size: 0.875rem;
    min-width: 12rem;
  }

  .control-range input[type='range'] {
    width: 200px;
  }

  @media (prefers-color-scheme: dark) {
    .control-input {
      background-color: #111827;
      border-color: #374151;
      color: #f9fafb;
    }

    .control-group span.control-label {
      color: #d1d5db;
    }
  }

  .checkbox {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.85rem;
    color: #374151;
  }

  .checkbox input {
    accent-color: #2563eb;
  }

  @media (prefers-color-scheme: dark) {
    .checkbox {
      color: #e5e7eb;
    }
  }

  .control-button {
    padding: 0.5rem 0.9rem;
    border-radius: 0.5rem;
    border: none;
    background-color: #2563eb;
    color: #ffffff;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .control-button:hover {
    background-color: #1d4ed8;
  }

  .graph-layout {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 1.5rem;
  }

  @media (max-width: 1024px) {
    .graph-layout {
      grid-template-columns: 1fr;
    }

    .graph-sidebar {
      order: -1;
    }
  }

  .graph-canvas {
    position: relative;
    border-radius: 0.75rem;
    border: 1px solid #e5e7eb;
    background: radial-gradient(circle, rgba(37, 99, 235, 0.05) 0%, rgba(15, 23, 42, 0.02) 80%);
    min-height: 560px;
    overflow: hidden;
  }

  @media (prefers-color-scheme: dark) {
    .graph-canvas {
      border-color: #334155;
      background: radial-gradient(circle, rgba(37, 99, 235, 0.1) 0%, rgba(15, 23, 42, 0.6) 80%);
    }
  }

  .graph-canvas svg {
    width: 100%;
    height: 100%;
  }

  .graph-link {
    stroke-opacity: 0.6;
  }

  .graph-link.cycle-edge {
    stroke: #ef4444;
    stroke-width: 2.5px;
  }

  .graph-node circle {
    cursor: pointer;
    transition:
      transform 0.15s ease,
      stroke-width 0.15s ease;
  }

  .graph-node:hover circle {
    transform: scale(1.1);
    stroke-width: 2px;
  }

  .graph-node circle.selected {
    stroke: #facc15;
    stroke-width: 2.5px;
  }

  .node-label {
    pointer-events: none;
    font-size: 0.7rem;
    font-weight: 500;
    fill: #1f2937;
    paint-order: stroke;
    stroke: #ffffff;
    stroke-width: 3px;
    stroke-linejoin: round;
  }

  @media (prefers-color-scheme: dark) {
    .node-label {
      fill: #f9fafb;
      stroke: #0f172a;
    }
  }

  .empty-overlay {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    background-color: rgba(249, 250, 251, 0.92);
    color: #6b7280;
    font-weight: 500;
  }

  .graph-sidebar {
    border-radius: 0.75rem;
    border: 1px solid #e5e7eb;
    padding: 1.5rem;
    background-color: #ffffff;
    box-shadow: 0 1px 3px rgb(15 23 42 / 0.08);
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  @media (prefers-color-scheme: dark) {
    .graph-sidebar {
      border-color: #334155;
      background-color: #1f2937;
      color: #e5e7eb;
    }
  }

  .sidebar-title {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
  }

  .sidebar-path {
    font-size: 0.85rem;
    color: #6b7280;
    word-break: break-all;
  }

  @media (prefers-color-scheme: dark) {
    .sidebar-path {
      color: #94a3b8;
    }
  }

  .sidebar-stat-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }

  .stat-label {
    display: block;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #6b7280;
  }

  .stat-value {
    font-size: 1rem;
    font-weight: 600;
  }

  @media (prefers-color-scheme: dark) {
    .stat-label {
      color: #9ca3af;
    }
  }

  .sidebar-section h3 {
    margin: 0 0 0.75rem 0;
    font-size: 1rem;
    font-weight: 600;
  }

  .sidebar-section ul {
    display: grid;
    gap: 0.75rem;
    padding: 0;
    list-style: none;
  }

  .sidebar-section li {
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 0.75rem;
    background-color: #f9fafb;
  }

  .module-name {
    display: block;
    font-weight: 600;
    font-size: 0.95rem;
  }

  .module-path {
    display: block;
    font-size: 0.75rem;
    color: #6b7280;
    word-break: break-all;
    margin-top: 0.15rem;
  }

  .module-meta {
    display: block;
    font-size: 0.75rem;
    color: #4b5563;
    margin-top: 0.5rem;
  }

  @media (prefers-color-scheme: dark) {
    .sidebar-section li {
      border-color: #334155;
      background-color: #111827;
    }

    .module-path {
      color: #94a3b8;
    }

    .module-meta {
      color: #cbd5f5;
    }
  }

  .empty-state {
    font-size: 0.85rem;
    color: #6b7280;
  }

  .sidebar-empty {
    display: grid;
    gap: 0.75rem;
    color: #4b5563;
  }

  .sidebar-empty h2 {
    margin: 0;
    font-size: 1.1rem;
  }

  @media (prefers-color-scheme: dark) {
    .sidebar-empty {
      color: #cbd5f5;
    }
  }
</style>
