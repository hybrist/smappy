<script lang="ts">
  import { onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import * as d3 from 'd3';
  import type { TreemapNode } from '$lib/server/query/types.js';
  import { getTreemapData } from '$lib/query/data.remote.js';

  interface Props {
    analysisId: number;
    width?: number;
    height?: number;
    includeSymbols?: boolean;
  }

  let { analysisId, width = 1200, height = 600, includeSymbols = false }: Props = $props();

  let containerElement = $state<HTMLDivElement | undefined>(undefined);
  let isLoading = $state(true);
  let error = $state<string | null>(null);
  let _treemapData = $state<TreemapNode | null>(null);
  let currentLevel = $state<TreemapNode | null>(null);
  let breadcrumbs = $state<TreemapNode[]>([]);
  let tooltip = $state<{
    visible: boolean;
    x: number;
    y: number;
    lines: string[];
  }>({ visible: false, x: 0, y: 0, lines: [] });

  // Color scales for different types
  const fileTypeColors: Record<string, string> = {
    javascript: '#f59e0b',
    typescript: '#3b82f6',
    css: '#8b5cf6',
    image: '#10b981',
    font: '#ec4899',
    json: '#6366f1',
    other: '#6b7280',
  };

  const sourceColors = {
    source: '#22c55e',
    thirdParty: '#ef4444',
  };

  function getNodeColor(node: TreemapNode): string {
    if (node.isThirdParty !== undefined) {
      return node.isThirdParty ? sourceColors.thirdParty : sourceColors.source;
    }
    if (node.fileType) {
      return fileTypeColors[node.fileType.toLowerCase()] || fileTypeColors.other;
    }
    return '#9ca3af';
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  function getNodeValue(node: TreemapNode): number {
    if (node.value !== undefined) return node.value;
    if (node.bundledSize !== undefined) return node.bundledSize;
    if (node.children && node.children.length > 0) {
      return node.children.reduce((sum, child) => sum + getNodeValue(child), 0);
    }
    return 0;
  }

  async function loadTreemapData() {
    isLoading = true;
    error = null;
    try {
      // Use remote function for type-safe server calls
      const data = await getTreemapData({
        analysisId,
        includeSymbols,
        maxModules: 1000,
      });

      _treemapData = data;
      currentLevel = data;
      breadcrumbs = [data];
      renderTreemap();
    } catch (err) {
      console.error('Error loading treemap data:', err);
      error = 'Failed to load treemap data. Please try again.';
    } finally {
      isLoading = false;
    }
  }

  function renderTreemap() {
    if (!containerElement || !currentLevel) return;

    // Clear previous content
    d3.select(containerElement).selectAll('*').remove();

    // Make treemap responsive
    const containerWidth = containerElement.clientWidth || width;
    const containerHeight = height;

    const svg = d3
      .select(containerElement)
      .append('svg')
      .attr('width', '100%')
      .attr('height', containerHeight)
      .attr('viewBox', `0 0 ${containerWidth} ${containerHeight}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('font-family', 'system-ui, -apple-system, sans-serif')
      .style('font-size', '12px');

    // Create hierarchy from current level
    const hierarchy = d3
      .hierarchy(currentLevel)
      .sum((d) => getNodeValue(d))
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // Create treemap layout
    const treemapLayout = d3
      .treemap<TreemapNode>()
      .size([containerWidth, containerHeight])
      .padding(2)
      .round(true);

    const root = treemapLayout(hierarchy);

    // Create cells for each node
    const cell = svg
      .selectAll('g')
      .data(root.leaves())
      .join('g')
      .attr('transform', (d) => `translate(${d.x0},${d.y0})`);

    // Add rectangles with animation
    cell
      .append('rect')
      .attr('width', 0)
      .attr('height', 0)
      .attr('fill', (d) => getNodeColor(d.data))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .attr('rx', 2)
      .attr('ry', 2)
      .style('cursor', (d) =>
        d.data.children && d.data.children.length > 0 ? 'pointer' : 'default',
      )
      .style('transition', 'fill 0.2s ease')
      .on('click', (event, d) => {
        if (d.data.children && d.data.children.length > 0) {
          drillDown(d.data);
        }
      })
      .on('mouseenter', function (event, d) {
        // Highlight on hover
        d3.select(this).attr('stroke', '#000').attr('stroke-width', 2);
        showTooltip(event, d.data);
      })
      .on('mousemove', (event) => {
        updateTooltipPosition(event);
      })
      .on('mouseleave', function () {
        // Remove highlight
        d3.select(this).attr('stroke', '#fff').attr('stroke-width', 1);
        hideTooltip();
      })
      .transition()
      .duration(500)
      .attr('width', (d) => d.x1 - d.x0)
      .attr('height', (d) => d.y1 - d.y0);

    // Add labels for larger cells
    cell
      .append('text')
      .attr('x', 4)
      .attr('y', 16)
      .attr('fill', '#fff')
      .attr('fill-opacity', 0)
      .style('font-size', '11px')
      .style('font-weight', '500')
      .style('pointer-events', 'none')
      .style('text-shadow', '0 1px 2px rgba(0,0,0,0.5)')
      .text((d) => {
        const cellWidth = d.x1 - d.x0;
        const cellHeight = d.y1 - d.y0;
        // Only show text if cell is large enough
        if (cellWidth > 60 && cellHeight > 20) {
          const name = d.data.name;
          const maxChars = Math.floor(cellWidth / 7);
          return name.length > maxChars ? name.substring(0, maxChars - 3) + '...' : name;
        }
        return '';
      })
      .transition()
      .delay(200)
      .duration(300)
      .attr('fill-opacity', 0.9);

    // Add size labels for larger cells
    cell
      .append('text')
      .attr('x', 4)
      .attr('y', 30)
      .attr('fill', '#fff')
      .attr('fill-opacity', 0)
      .style('font-size', '10px')
      .style('pointer-events', 'none')
      .style('text-shadow', '0 1px 2px rgba(0,0,0,0.5)')
      .text((d) => {
        const cellWidth = d.x1 - d.x0;
        const cellHeight = d.y1 - d.y0;
        // Only show size if cell is large enough
        if (cellWidth > 80 && cellHeight > 35) {
          return formatBytes(getNodeValue(d.data));
        }
        return '';
      })
      .transition()
      .delay(200)
      .duration(300)
      .attr('fill-opacity', 0.7);
  }

  function drillDown(node: TreemapNode) {
    if (!node.children || node.children.length === 0) return;
    currentLevel = node;
    breadcrumbs = [...breadcrumbs, node];
    renderTreemap();
  }

  function navigateTo(index: number) {
    if (index < 0 || index >= breadcrumbs.length) return;
    currentLevel = breadcrumbs[index];
    breadcrumbs = breadcrumbs.slice(0, index + 1);
    renderTreemap();
  }

  function showTooltip(event: MouseEvent, node: TreemapNode) {
    const lines: string[] = [];
    lines.push(node.name);

    if (node.filePath) {
      lines.push(`Path: ${node.filePath}`);
    }

    if (node.bundledSize !== undefined) {
      lines.push(`Bundled: ${formatBytes(node.bundledSize)}`);
    }

    if (node.originalSize !== undefined) {
      lines.push(`Original: ${formatBytes(node.originalSize)}`);
    }

    if (node.gzipSize !== undefined) {
      lines.push(`Gzip: ${formatBytes(node.gzipSize)}`);
    }

    if (node.fileType) {
      lines.push(`Type: ${node.fileType}`);
    }

    if (node.isThirdParty !== undefined) {
      lines.push(`Source: ${node.isThirdParty ? 'Third-party' : 'First-party'}`);
    }

    if (node.packageName) {
      lines.push(`Package: ${node.packageName}`);
    }

    tooltip = {
      visible: true,
      x: event.clientX,
      y: event.clientY,
      lines,
    };
  }

  function updateTooltipPosition(event: MouseEvent) {
    if (tooltip.visible) {
      tooltip = {
        ...tooltip,
        x: event.clientX,
        y: event.clientY,
      };
    }
  }

  function hideTooltip() {
    tooltip = { ...tooltip, visible: false };
  }

  // Handle window resize
  let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
  function handleResize() {
    if (resizeTimeout) clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      renderTreemap();
    }, 250);
  }

  onDestroy(() => {
    // Cleanup D3 elements
    if (containerElement) {
      d3.select(containerElement).selectAll('*').remove();
    }
    // Remove resize listener
    if (browser) {
      window.removeEventListener('resize', handleResize);
    }
    if (resizeTimeout) clearTimeout(resizeTimeout);
  });

  // Load data and handle resize events
  $effect(() => {
    // Access both dependencies to make effect reactive to changes
    const id = analysisId;
    const _symbols = includeSymbols;

    if (id) {
      loadTreemapData();
    }

    // Setup resize listener (only in browser and only once)
    if (browser && typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);

      // Return cleanup function
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  });
</script>

<div class="treemap-container">
  {#if isLoading}
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading treemap visualization...</p>
    </div>
  {:else if error}
    <div class="error-state">
      <p>{error}</p>
      <button type="button" onclick={() => loadTreemapData()} class="retry-button"> Retry </button>
    </div>
  {:else if currentLevel}
    <!-- Breadcrumb navigation -->
    <div class="breadcrumbs" role="navigation" aria-label="Treemap navigation">
      {#each breadcrumbs as crumb, index (index)}
        <button
          type="button"
          class="breadcrumb-item"
          class:active={index === breadcrumbs.length - 1}
          onclick={() => navigateTo(index)}
        >
          {crumb.name === 'root' ? 'All Modules' : crumb.name}
        </button>
        {#if index < breadcrumbs.length - 1}
          <span class="breadcrumb-separator">/</span>
        {/if}
      {/each}
    </div>

    <!-- Legend -->
    <div class="legend">
      <div class="legend-title">Color Key:</div>
      <div class="legend-items">
        <div class="legend-item">
          <span class="legend-color" style="background-color: {sourceColors.source}"></span>
          <span class="legend-label">Source Code</span>
        </div>
        <div class="legend-item">
          <span class="legend-color" style="background-color: {sourceColors.thirdParty}"></span>
          <span class="legend-label">Third-party</span>
        </div>
      </div>
    </div>

    <!-- Treemap visualization -->
    <div class="treemap-svg-container" bind:this={containerElement}></div>

    <!-- Tooltip -->
    {#if tooltip.visible}
      <div
        class="tooltip"
        style="left: {tooltip.x + 10}px; top: {tooltip.y + 10}px;"
        role="tooltip"
      >
        {#each tooltip.lines as line, index (index)}
          {#if index === 0}
            <div class="tooltip-title">{line}</div>
          {:else}
            <div class="tooltip-line">{line}</div>
          {/if}
        {/each}
      </div>
    {/if}
  {/if}
</div>

<style>
  .treemap-container {
    position: relative;
    width: 100%;
    min-height: 600px;
  }

  .loading-state,
  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    color: #6b7280;
  }

  @media (prefers-color-scheme: dark) {
    .loading-state,
    .error-state {
      color: #9ca3af;
    }
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #e5e7eb;
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-bottom: 1rem;
  }

  @media (prefers-color-scheme: dark) {
    .spinner {
      border-color: #374151;
      border-top-color: #60a5fa;
    }
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .error-state p {
    margin-bottom: 1rem;
    color: #dc2626;
  }

  @media (prefers-color-scheme: dark) {
    .error-state p {
      color: #ef4444;
    }
  }

  .retry-button {
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    border: 1px solid #d1d5db;
    background-color: #ffffff;
    color: #111827;
    cursor: pointer;
    font-size: 0.875rem;
  }

  @media (prefers-color-scheme: dark) {
    .retry-button {
      border-color: #4b5563;
      background-color: #1f2937;
      color: #ffffff;
    }
  }

  .retry-button:hover {
    background-color: #f9fafb;
  }

  @media (prefers-color-scheme: dark) {
    .retry-button:hover {
      background-color: #111827;
    }
  }

  .breadcrumbs {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    margin-bottom: 1rem;
    background-color: #f9fafb;
    border-radius: 0.375rem;
    overflow-x: auto;
  }

  @media (prefers-color-scheme: dark) {
    .breadcrumbs {
      background-color: #111827;
    }
  }

  .breadcrumb-item {
    padding: 0.25rem 0.5rem;
    background: none;
    border: none;
    color: #3b82f6;
    cursor: pointer;
    font-size: 0.875rem;
    white-space: nowrap;
    transition: color 0.2s;
  }

  .breadcrumb-item:hover {
    color: #2563eb;
    text-decoration: underline;
  }

  .breadcrumb-item.active {
    color: #111827;
    cursor: default;
    font-weight: 500;
  }

  @media (prefers-color-scheme: dark) {
    .breadcrumb-item {
      color: #60a5fa;
    }

    .breadcrumb-item:hover {
      color: #93c5fd;
    }

    .breadcrumb-item.active {
      color: #ffffff;
    }
  }

  .breadcrumb-separator {
    color: #9ca3af;
    font-size: 0.875rem;
  }

  .legend {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem;
    margin-bottom: 1rem;
    background-color: #f9fafb;
    border-radius: 0.375rem;
    flex-wrap: wrap;
  }

  @media (prefers-color-scheme: dark) {
    .legend {
      background-color: #111827;
    }
  }

  .legend-title {
    font-size: 0.875rem;
    font-weight: 500;
    color: #111827;
  }

  @media (prefers-color-scheme: dark) {
    .legend-title {
      color: #ffffff;
    }
  }

  .legend-items {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .legend-color {
    width: 16px;
    height: 16px;
    border-radius: 0.25rem;
    border: 1px solid rgba(0, 0, 0, 0.1);
  }

  .legend-label {
    font-size: 0.875rem;
    color: #6b7280;
  }

  @media (prefers-color-scheme: dark) {
    .legend-label {
      color: #9ca3af;
    }
  }

  .treemap-svg-container {
    width: 100%;
    overflow-x: auto;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    background-color: #ffffff;
  }

  @media (prefers-color-scheme: dark) {
    .treemap-svg-container {
      border-color: #374151;
      background-color: #1f2937;
    }
  }

  .tooltip {
    position: fixed;
    pointer-events: none;
    background-color: rgba(0, 0, 0, 0.9);
    color: #ffffff;
    padding: 0.75rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    line-height: 1.5;
    max-width: 300px;
    z-index: 1000;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  @media (prefers-color-scheme: dark) {
    .tooltip {
      background-color: rgba(255, 255, 255, 0.95);
      color: #111827;
    }
  }

  .tooltip-title {
    font-weight: 600;
    margin-bottom: 0.25rem;
  }

  .tooltip-line {
    font-size: 0.8125rem;
    opacity: 0.9;
  }
</style>
