<script lang="ts">
  import type { TreemapNode } from '$lib/server/query/types.js';
  import { getTreemapData } from '$lib/query/data.remote.js';
  import TreemapVisualizationView from './TreemapVisualizationView.svelte';

  interface Props {
    analysisId: number;
    width?: number;
    height?: number;
    includeSymbols?: boolean;
  }

  let { analysisId, width = 1200, height = 600, includeSymbols = false }: Props = $props();

  let isLoading = $state(true);
  let error = $state<string | null>(null);
  let _treemapData = $state<TreemapNode | null>(null);

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
    } catch (err) {
      console.error('Error loading treemap data:', err);
      error = 'Failed to load treemap data. Please try again.';
    } finally {
      isLoading = false;
    }
  }

  // Load data when analysisId or includeSymbols changes
  $effect(() => {
    // Access both dependencies to make effect reactive to changes
    const id = analysisId;
    const _symbols = includeSymbols;

    if (id) {
      loadTreemapData();
    }
  });
</script>

<TreemapVisualizationView
  data={_treemapData}
  {width}
  {height}
  {isLoading}
  {error}
  onRetry={loadTreemapData}
/>
