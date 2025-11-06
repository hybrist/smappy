<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="demo-container">
	<h1>Remote Functions Demo</h1>
	<p>This page demonstrates server-side usage of SvelteKit remote query functions.</p>

	{#if data.error}
		<div class="error">{data.error}</div>
	{:else if data.analysis}
		<div class="demo-section">
			<h2>Analysis Result</h2>
			<pre>{JSON.stringify(data.analysis, null, 2)}</pre>
		</div>

		{#if data.modules}
			<div class="demo-section">
				<h2>Modules</h2>
				<p>Total: {data.modules.pagination.total}</p>
				<ul>
					{#each data.modules.data as module (module.id)}
						<li>
							{module.filePath} ({module.bundledSize} bytes)
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	{:else}
		<p>No data available. Make sure to ingest some bundle data first.</p>
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

	.error {
		color: red;
		padding: 1rem;
		background: #fee;
		border-radius: 4px;
		margin-top: 1rem;
	}

	pre {
		background: #f5f5f5;
		padding: 1rem;
		border-radius: 4px;
		overflow-x: auto;
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

