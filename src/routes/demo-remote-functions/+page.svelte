<script lang="ts">
  import { getLatestAnalysis, getModulesByAnalysis } from '$lib/server/query/data.remote';
  import { onMount } from 'svelte';

  let projectName = $state('test-project');
  let analysisId = $state<number | null>(null);
  let loading = $state(false);
  let error = $state<string | null>(null);
  let latestAnalysis = $state<unknown>(null);
  let modules = $state<unknown>(null);

  async function loadLatestAnalysis() {
    loading = true;
    error = null;
    try {
      latestAnalysis = await getLatestAnalysis(projectName);
      analysisId = latestAnalysis.id;
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : 'Failed to load analysis';
    } finally {
      loading = false;
    }
  }

  async function loadModules() {
    if (!analysisId) return;
    loading = true;
    error = null;
    try {
      const result = await getModulesByAnalysis({
        analysisId,
        options: { limit: 10 },
      });
      modules = result;
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : 'Failed to load modules';
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    // Example: Load latest analysis on mount
    // loadLatestAnalysis();
  });
</script>

<div class="demo-container">
  <h1>Remote Functions Demo</h1>
  <p>This page demonstrates client-side usage of SvelteKit remote query functions.</p>

  <div class="demo-section">
    <h2>Get Latest Analysis</h2>
    <div class="input-group">
      <label for="project-name">Project Name:</label>
      <input id="project-name" type="text" bind:value={projectName} />
      <button onclick={loadLatestAnalysis} disabled={loading}>
        {loading ? 'Loading...' : 'Load Latest Analysis'}
      </button>
    </div>

    {#if error}
      <div class="error">{error}</div>
    {/if}

    {#if latestAnalysis}
      <div class="result">
        <h3>Analysis Result:</h3>
        <pre>{JSON.stringify(latestAnalysis as Record<string, unknown>, null, 2)}</pre>
        <button onclick={loadModules}>Load Modules</button>
      </div>
    {/if}
  </div>

  {#if modules}
    <div class="demo-section">
      <h2>Modules</h2>
      {#if modules && typeof modules === 'object' && 'pagination' in modules && 'data' in modules}
        {@const mods = modules as {
          pagination: { total: number };
          data: Array<{ id: number; filePath: string; bundledSize: number }>;
        }}
        <p>Total: {mods.pagination.total}</p>
        <ul>
          {#each mods.data as module (module.id)}
            <li>
              {module.filePath} ({module.bundledSize} bytes)
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/if}
</div>

<style>
  .demo-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
  }

  .demo-section {
    margin-bottom: 2rem;
    padding: 1rem;
    border: 1px solid #ccc;
    border-radius: 4px;
  }

  .input-group {
    display: flex;
    gap: 1rem;
    align-items: center;
    margin-bottom: 1rem;
  }

  .input-group label {
    font-weight: bold;
  }

  .input-group input {
    flex: 1;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
  }

  .input-group button {
    padding: 0.5rem 1rem;
    background: #0070f3;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .input-group button:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  .error {
    color: red;
    padding: 1rem;
    background: #fee;
    border-radius: 4px;
    margin-top: 1rem;
  }

  .result {
    margin-top: 1rem;
  }

  .result pre {
    background: #f5f5f5;
    padding: 1rem;
    border-radius: 4px;
    overflow-x: auto;
  }

  .result button {
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    background: #0070f3;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  ul {
    list-style: none;
    padding: 0;
  }

  li {
    padding: 0.5rem;
    border-bottom: 1px solid #eee;
  }
</style>
