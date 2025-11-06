<script lang="ts">
  import type { Bundle, Chunk, Module } from '$lib/server/query/types.js';

  interface Props {
    bundles: Bundle[];
    bundleBreakdown: Record<string, { count: number; totalSize: number; totalGzipSize: number }>;
    chunks: Chunk[];
    topModules: Module[];
    analysisId: number;
  }

  let { bundles: _bundles, bundleBreakdown, chunks, topModules, analysisId }: Props = $props();

  // Module table state
  let searchQuery = $state('');
  let fileTypeFilter = $state<string | null>(null);
  let thirdPartyFilter = $state<boolean | null>(null);
  let sortBy = $state<'filePath' | 'bundledSize' | 'originalSize'>('bundledSize');
  let sortOrder = $state<'asc' | 'desc'>('desc');
  let currentPage = $state(1);
  let pageSize = $state(50);

  // Module data (will be loaded via server function)
  let modules = $state<Module[]>([]);
  let totalModules = $state(0);
  let totalPages = $state(0);
  let isLoadingModules = $state(false);

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  function getFileTypeColor(fileType: string): string {
    const colors: Record<string, string> = {
      javascript: '#f59e0b',
      css: '#3b82f6',
      image: '#10b981',
      font: '#8b5cf6',
      other: '#6b7280',
    };
    return colors[fileType.toLowerCase()] || colors.other;
  }

  async function loadModules() {
    isLoadingModules = true;
    try {
      const params: string[] = [
        `analysisId=${encodeURIComponent(analysisId.toString())}`,
        `page=${encodeURIComponent(currentPage.toString())}`,
        `pageSize=${encodeURIComponent(pageSize.toString())}`,
        `sortBy=${encodeURIComponent(sortBy)}`,
        `sortOrder=${encodeURIComponent(sortOrder)}`,
      ];
      if (searchQuery) params.push(`search=${encodeURIComponent(searchQuery)}`);
      if (fileTypeFilter) params.push(`fileType=${encodeURIComponent(fileTypeFilter)}`);
      if (thirdPartyFilter !== null)
        params.push(`isThirdParty=${encodeURIComponent(thirdPartyFilter.toString())}`);

      const response = await fetch(`/api/modules?${params.join('&')}`);
      const data = await response.json();
      modules = data.items || [];
      totalModules = data.total || 0;
      totalPages = data.totalPages || 0;
    } catch (error) {
      console.error('Error loading modules:', error);
      modules = [];
      totalModules = 0;
      totalPages = 0;
    } finally {
      isLoadingModules = false;
    }
  }

  function handleSort(field: 'filePath' | 'bundledSize' | 'originalSize') {
    if (sortBy === field) {
      sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      sortBy = field;
      sortOrder = 'desc';
    }
    currentPage = 1;
    // Module loading will be triggered by $effect when state changes
  }

  function handleSearch() {
    currentPage = 1;
    // Module loading will be triggered by $effect when state changes
  }

  function handleFilter() {
    currentPage = 1;
    // Module loading will be triggered by $effect when state changes
  }

  // Create a reactive key that changes when we need to reload
  const reloadKey = $derived(
    `${analysisId}-${currentPage}-${sortBy}-${sortOrder}-${searchQuery}-${fileTypeFilter}-${thirdPartyFilter}`,
  );

  // Load modules when the reload key changes
  $effect(() => {
    if (analysisId && reloadKey) {
      loadModules();
    }
  });

  // Extract unique file types from bundles
  const bundleFileTypes = $derived(Object.keys(bundleBreakdown));
</script>

<div class="bundle-overview">
  <!-- Bundle Breakdown by File Type -->
  <section class="section" aria-label="Bundle breakdown by file type">
    <h2 class="section-title">Bundle Breakdown</h2>
    <div class="breakdown-grid">
      {#each bundleFileTypes as fileType (fileType)}
        {@const stats = bundleBreakdown[fileType]}
        <div class="breakdown-card">
          <div class="breakdown-header">
            <span
              class="file-type-badge"
              style="background-color: {getFileTypeColor(fileType)}20; color: {getFileTypeColor(
                fileType,
              )}"
            >
              {fileType}
            </span>
            <span class="breakdown-count">{stats.count} file{stats.count !== 1 ? 's' : ''}</span>
          </div>
          <div class="breakdown-stats">
            <div class="stat">
              <span class="stat-label">Size:</span>
              <span class="stat-value">{formatBytes(stats.totalSize)}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Gzip:</span>
              <span class="stat-value">{formatBytes(stats.totalGzipSize)}</span>
            </div>
          </div>
        </div>
      {/each}
    </div>
  </section>

  <!-- Chunks Information -->
  {#if chunks.length > 0}
    <section class="section" aria-label="Chunk information">
      <h2 class="section-title">Chunks ({chunks.length})</h2>
      <div class="chunks-table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Size</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            {#each chunks as chunk (chunk.id)}
              <tr>
                <td>
                  <span class="chunk-name">{chunk.name || '(unnamed)'}</span>
                  {#if chunk.isEntry}
                    <span class="badge badge-entry">Entry</span>
                  {/if}
                  {#if chunk.isAsync}
                    <span class="badge badge-async">Async</span>
                  {/if}
                </td>
                <td>{formatBytes(chunk.totalSize)}</td>
                <td>
                  {#if chunk.isEntry && chunk.isAsync}
                    Entry + Async
                  {:else if chunk.isEntry}
                    Entry
                  {:else if chunk.isAsync}
                    Async
                  {:else}
                    Regular
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  {/if}

  <!-- Top Largest Modules -->
  {#if topModules.length > 0}
    <section class="section" aria-label="Top largest modules">
      <h2 class="section-title">Top Largest Modules</h2>
      <div class="modules-table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Module</th>
              <th>Type</th>
              <th>Bundled Size</th>
              <th>Original Size</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {#each topModules as module (module.id)}
              <tr>
                <td class="module-path">{module.filePath}</td>
                <td>
                  <span
                    class="file-type-badge small"
                    style="background-color: {getFileTypeColor(
                      module.fileType,
                    )}20; color: {getFileTypeColor(module.fileType)}"
                  >
                    {module.fileType}
                  </span>
                </td>
                <td>{formatBytes(module.bundledSize)}</td>
                <td>{formatBytes(module.originalSize)}</td>
                <td>
                  {#if module.isThirdParty}
                    <span class="badge badge-third-party">Third-party</span>
                  {:else}
                    <span class="badge badge-source">Source</span>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  {/if}

  <!-- Module Table with Search and Filtering -->
  <section class="section" aria-label="All modules">
    <div class="section-header">
      <h2 class="section-title">All Modules ({totalModules})</h2>
    </div>

    <!-- Search and Filters -->
    <div class="filters">
      <div class="search-box">
        <input
          type="text"
          placeholder="Search modules..."
          bind:value={searchQuery}
          on:input={handleSearch}
          class="search-input"
        />
      </div>
      <div class="filter-group">
        <select bind:value={fileTypeFilter} on:change={handleFilter} class="filter-select">
          <option value={null}>All File Types</option>
          {#each bundleFileTypes as type (type)}
            <option value={type}>{type}</option>
          {/each}
        </select>
        <select bind:value={thirdPartyFilter} on:change={handleFilter} class="filter-select">
          <option value={null}>All Sources</option>
          <option value={false}>Source Only</option>
          <option value={true}>Third-party Only</option>
        </select>
      </div>
    </div>

    <!-- Modules Table -->
    <div class="modules-table-container">
      {#if isLoadingModules}
        <div class="loading">Loading modules...</div>
      {:else if modules.length === 0}
        <div class="empty-state">No modules found</div>
      {:else}
        <table class="data-table">
          <thead>
            <tr>
              <th>
                <button
                  type="button"
                  class="sort-button"
                  onclick={() => handleSort('filePath')}
                  aria-label="Sort by file path"
                >
                  Module
                  {#if sortBy === 'filePath'}
                    {sortOrder === 'asc' ? ' ↑' : ' ↓'}
                  {/if}
                </button>
              </th>
              <th>Type</th>
              <th>
                <button
                  type="button"
                  class="sort-button"
                  onclick={() => handleSort('bundledSize')}
                  aria-label="Sort by bundled size"
                >
                  Bundled Size
                  {#if sortBy === 'bundledSize'}
                    {sortOrder === 'asc' ? ' ↑' : ' ↓'}
                  {/if}
                </button>
              </th>
              <th>
                <button
                  type="button"
                  class="sort-button"
                  onclick={() => handleSort('originalSize')}
                  aria-label="Sort by original size"
                >
                  Original Size
                  {#if sortBy === 'originalSize'}
                    {sortOrder === 'asc' ? ' ↑' : ' ↓'}
                  {/if}
                </button>
              </th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {#each modules as module (module.id)}
              <tr>
                <td class="module-path">{module.filePath}</td>
                <td>
                  <span
                    class="file-type-badge small"
                    style="background-color: {getFileTypeColor(
                      module.fileType,
                    )}20; color: {getFileTypeColor(module.fileType)}"
                  >
                    {module.fileType}
                  </span>
                </td>
                <td>{formatBytes(module.bundledSize)}</td>
                <td>{formatBytes(module.originalSize)}</td>
                <td>
                  {#if module.isThirdParty}
                    <span class="badge badge-third-party">Third-party</span>
                  {:else}
                    <span class="badge badge-source">Source</span>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>

    <!-- Pagination -->
    {#if totalPages > 1}
      <div class="pagination">
        <button
          type="button"
          onclick={() => {
            currentPage = Math.max(1, currentPage - 1);
          }}
          disabled={currentPage === 1}
          class="pagination-button"
        >
          Previous
        </button>
        <span class="pagination-info">
          Page {currentPage} of {totalPages}
        </span>
        <button
          type="button"
          onclick={() => {
            currentPage = Math.min(totalPages, currentPage + 1);
          }}
          disabled={currentPage === totalPages}
          class="pagination-button"
        >
          Next
        </button>
      </div>
    {/if}
  </section>
</div>

<style>
  .bundle-overview {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .section-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #111827;
    margin: 0;
  }

  @media (prefers-color-scheme: dark) {
    .section-title {
      color: #ffffff;
    }
  }

  .breakdown-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
  }

  .breakdown-card {
    border-radius: 0.5rem;
    border: 1px solid #e5e7eb;
    background-color: #ffffff;
    padding: 1rem;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  }

  @media (prefers-color-scheme: dark) {
    .breakdown-card {
      border-color: #374151;
      background-color: #1f2937;
    }
  }

  .breakdown-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .file-type-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: capitalize;
  }

  .file-type-badge.small {
    padding: 0.125rem 0.5rem;
    font-size: 0.6875rem;
  }

  .breakdown-count {
    font-size: 0.875rem;
    color: #6b7280;
  }

  @media (prefers-color-scheme: dark) {
    .breakdown-count {
      color: #9ca3af;
    }
  }

  .breakdown-stats {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .stat {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .stat-label {
    font-size: 0.875rem;
    color: #6b7280;
  }

  @media (prefers-color-scheme: dark) {
    .stat-label {
      color: #9ca3af;
    }
  }

  .stat-value {
    font-weight: 600;
    color: #111827;
  }

  @media (prefers-color-scheme: dark) {
    .stat-value {
      color: #ffffff;
    }
  }

  .chunks-table-container,
  .modules-table-container {
    overflow-x: auto;
    border-radius: 0.5rem;
    border: 1px solid #e5e7eb;
    background-color: #ffffff;
  }

  @media (prefers-color-scheme: dark) {
    .chunks-table-container,
    .modules-table-container {
      border-color: #374151;
      background-color: #1f2937;
    }
  }

  .data-table {
    width: 100%;
    border-collapse: collapse;
  }

  .data-table thead {
    background-color: #f9fafb;
    border-bottom: 2px solid #e5e7eb;
  }

  @media (prefers-color-scheme: dark) {
    .data-table thead {
      background-color: #111827;
      border-bottom-color: #374151;
    }
  }

  .data-table th {
    padding: 0.75rem 1rem;
    text-align: left;
    font-size: 0.875rem;
    font-weight: 500;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  @media (prefers-color-scheme: dark) {
    .data-table th {
      color: #9ca3af;
    }
  }

  .data-table td {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #e5e7eb;
    font-size: 0.875rem;
    color: #111827;
  }

  @media (prefers-color-scheme: dark) {
    .data-table td {
      border-bottom-color: #374151;
      color: #ffffff;
    }
  }

  .data-table tbody tr:hover {
    background-color: #f9fafb;
  }

  @media (prefers-color-scheme: dark) {
    .data-table tbody tr:hover {
      background-color: #111827;
    }
  }

  .module-path {
    font-family: ui-monospace, 'Courier New', monospace;
    font-size: 0.8125rem;
    word-break: break-all;
  }

  .chunk-name {
    font-weight: 500;
  }

  .badge {
    display: inline-block;
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.6875rem;
    font-weight: 500;
    margin-left: 0.5rem;
  }

  .badge-entry {
    background-color: #dbeafe;
    color: #1e40af;
  }

  @media (prefers-color-scheme: dark) {
    .badge-entry {
      background-color: #1e3a8a;
      color: #bfdbfe;
    }
  }

  .badge-async {
    background-color: #fef3c7;
    color: #92400e;
  }

  @media (prefers-color-scheme: dark) {
    .badge-async {
      background-color: #78350f;
      color: #fde68a;
    }
  }

  .badge-third-party {
    background-color: #fce7f3;
    color: #9f1239;
  }

  @media (prefers-color-scheme: dark) {
    .badge-third-party {
      background-color: #831843;
      color: #fbcfe8;
    }
  }

  .badge-source {
    background-color: #d1fae5;
    color: #065f46;
  }

  @media (prefers-color-scheme: dark) {
    .badge-source {
      background-color: #064e3b;
      color: #a7f3d0;
    }
  }

  .filters {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  @media (min-width: 640px) {
    .filters {
      flex-direction: row;
      align-items: center;
    }
  }

  .search-box {
    flex: 1;
  }

  .search-input {
    width: 100%;
    padding: 0.5rem 0.75rem;
    border-radius: 0.375rem;
    border: 1px solid #d1d5db;
    background-color: #ffffff;
    font-size: 0.875rem;
    color: #111827;
  }

  @media (prefers-color-scheme: dark) {
    .search-input {
      border-color: #4b5563;
      background-color: #1f2937;
      color: #ffffff;
    }
  }

  .search-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgb(59 130 246 / 0.1);
  }

  .filter-group {
    display: flex;
    gap: 0.5rem;
  }

  .filter-select {
    padding: 0.5rem 0.75rem;
    border-radius: 0.375rem;
    border: 1px solid #d1d5db;
    background-color: #ffffff;
    font-size: 0.875rem;
    color: #111827;
    cursor: pointer;
  }

  @media (prefers-color-scheme: dark) {
    .filter-select {
      border-color: #4b5563;
      background-color: #1f2937;
      color: #ffffff;
    }
  }

  .filter-select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgb(59 130 246 / 0.1);
  }

  .sort-button {
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    color: inherit;
    cursor: pointer;
    text-align: left;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .sort-button:hover {
    color: #111827;
  }

  @media (prefers-color-scheme: dark) {
    .sort-button:hover {
      color: #ffffff;
    }
  }

  .loading,
  .empty-state {
    padding: 2rem;
    text-align: center;
    color: #6b7280;
  }

  @media (prefers-color-scheme: dark) {
    .loading,
    .empty-state {
      color: #9ca3af;
    }
  }

  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
  }

  .pagination-button {
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    border: 1px solid #d1d5db;
    background-color: #ffffff;
    font-size: 0.875rem;
    color: #111827;
    cursor: pointer;
  }

  @media (prefers-color-scheme: dark) {
    .pagination-button {
      border-color: #4b5563;
      background-color: #1f2937;
      color: #ffffff;
    }
  }

  .pagination-button:hover:not(:disabled) {
    background-color: #f9fafb;
    border-color: #9ca3af;
  }

  @media (prefers-color-scheme: dark) {
    .pagination-button:hover:not(:disabled) {
      background-color: #111827;
      border-color: #6b7280;
    }
  }

  .pagination-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .pagination-info {
    font-size: 0.875rem;
    color: #6b7280;
  }

  @media (prefers-color-scheme: dark) {
    .pagination-info {
      color: #9ca3af;
    }
  }
</style>
