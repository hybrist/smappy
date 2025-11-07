<script lang="ts">
  import { goto } from '$app/navigation';
  import DashboardLayout from '../DashboardLayout.svelte';
  import ProjectSelector from '../ProjectSelector.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import StatCard from '$lib/components/ui/StatCard.svelte';

  let { data } = $props();

  const projectName = $derived(data.projectName);
  const comparison = $derived(data.comparison);
  const projects = $derived(data.projects);
  const analysisHistory = $derived(data.analysisHistory);
  const baseId = $derived(data.baseId);
  const compareId = $derived(data.compareId);

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  function formatDelta(delta: number): string {
    const sign = delta > 0 ? '+' : '';
    return `${sign}${formatBytes(delta)}`;
  }

  function formatPercentage(delta: number, base: number): string {
    if (base === 0) return delta > 0 ? '+100%' : '0%';
    const percentage = ((delta / base) * 100).toFixed(2);
    const sign = delta > 0 ? '+' : '';
    return `${sign}${percentage}%`;
  }

  function getDeltaClass(delta: number): string {
    if (delta > 0) return 'delta-increase';
    if (delta < 0) return 'delta-decrease';
    return 'delta-neutral';
  }

  function handleComparisonChange(newBaseId: number, newCompareId: number) {
    goto(
      `/dashboard/${encodeURIComponent(projectName)}/compare?baseId=${newBaseId}&compareId=${newCompareId}`,
    );
  }
</script>

<DashboardLayout>
  <div class="comparison-container">
    <div class="comparison-header">
      <ProjectSelector {projects} {projectName} />
    </div>
    <PageHeader title="Analysis Comparison" />

    <div class="analysis-selector">
      <div class="selector-group">
        <label for="base-select">Base Analysis</label>
        <select
          id="base-select"
          value={baseId}
          onchange={(e) => handleComparisonChange(parseInt(e.currentTarget.value), compareId)}
        >
          {#each analysisHistory as analysis (analysis.id)}
            <option value={analysis.id}>
              {new Date(analysis.createdAt).toLocaleString()} - {formatBytes(
                analysis.totalSize ?? 0,
              )}
            </option>
          {/each}
        </select>
      </div>

      <div class="selector-arrow">→</div>

      <div class="selector-group">
        <label for="compare-select">Compare Analysis</label>
        <select
          id="compare-select"
          value={compareId}
          onchange={(e) => handleComparisonChange(baseId, parseInt(e.currentTarget.value))}
        >
          {#each analysisHistory as analysis (analysis.id)}
            <option value={analysis.id}>
              {new Date(analysis.createdAt).toLocaleString()} - {formatBytes(
                analysis.totalSize ?? 0,
              )}
            </option>
          {/each}
        </select>
      </div>
    </div>

    {#if comparison}
      <!-- Summary Statistics -->
      <section class="stats-section" aria-label="Comparison summary">
        <StatCard
          title="Total Size"
          value={formatBytes(comparison.run2.totalSize ?? 0)}
          subtitle={`${formatDelta(comparison.sizeDelta.totalSize)} (${formatPercentage(comparison.sizeDelta.totalSize, comparison.run1.totalSize ?? 0)})`}
        />
        <StatCard
          title="Gzip Size"
          value={formatBytes(comparison.run2.totalGzipSize ?? 0)}
          subtitle={`${formatDelta(comparison.sizeDelta.totalGzipSize)} (${formatPercentage(comparison.sizeDelta.totalGzipSize, comparison.run1.totalGzipSize ?? 0)})`}
        />
        <StatCard
          title="Modules"
          value={`${comparison.run2.moduleCount ?? 0}`}
          subtitle={`+${comparison.moduleDiff.added.length} -${comparison.moduleDiff.removed.length} ~${comparison.moduleDiff.modified.length}`}
        />
        <StatCard
          title="Bundles"
          value={`${comparison.run2.bundleCount ?? 0}`}
          subtitle={`+${comparison.bundleDiff.added} -${comparison.bundleDiff.removed} ~${comparison.bundleDiff.modified}`}
        />
      </section>

      <!-- Module Changes -->
      <section class="changes-section">
        <h2>Module Changes</h2>

        <!-- Modified Modules -->
        {#if comparison.moduleDiff.modified.length > 0}
          <div class="change-group">
            <h3 class="change-group-title">
              <span class="change-badge change-modified">Modified</span>
              {comparison.moduleDiff.modified.length} module{comparison.moduleDiff.modified
                .length !== 1
                ? 's'
                : ''}
            </h3>
            <div class="module-list">
              {#each comparison.moduleDiff.modified.slice(0, 20) as change (change.module.id)}
                <div class="module-item">
                  <div class="module-info">
                    <span class="module-path">{change.module.filePath}</span>
                    {#if change.exportsChanged}
                      <span class="export-badge">Exports changed</span>
                    {/if}
                  </div>
                  <div class="module-stats">
                    <span class={getDeltaClass(change.sizeDelta)}>
                      {formatDelta(change.sizeDelta)}
                    </span>
                  </div>
                </div>
              {/each}
              {#if comparison.moduleDiff.modified.length > 20}
                <p class="more-items">
                  ... and {comparison.moduleDiff.modified.length - 20} more
                </p>
              {/if}
            </div>
          </div>
        {/if}

        <!-- Added Modules -->
        {#if comparison.moduleDiff.added.length > 0}
          <div class="change-group">
            <h3 class="change-group-title">
              <span class="change-badge change-added">Added</span>
              {comparison.moduleDiff.added.length} module{comparison.moduleDiff.added.length !== 1
                ? 's'
                : ''}
            </h3>
            <div class="module-list">
              {#each comparison.moduleDiff.added.slice(0, 20) as module (module.id)}
                <div class="module-item">
                  <div class="module-info">
                    <span class="module-path">{module.filePath}</span>
                  </div>
                  <div class="module-stats">
                    <span class="delta-increase">{formatBytes(module.bundledSize)}</span>
                  </div>
                </div>
              {/each}
              {#if comparison.moduleDiff.added.length > 20}
                <p class="more-items">
                  ... and {comparison.moduleDiff.added.length - 20} more
                </p>
              {/if}
            </div>
          </div>
        {/if}

        <!-- Removed Modules -->
        {#if comparison.moduleDiff.removed.length > 0}
          <div class="change-group">
            <h3 class="change-group-title">
              <span class="change-badge change-removed">Removed</span>
              {comparison.moduleDiff.removed.length} module{comparison.moduleDiff.removed.length !==
              1
                ? 's'
                : ''}
            </h3>
            <div class="module-list">
              {#each comparison.moduleDiff.removed.slice(0, 20) as module (module.id)}
                <div class="module-item">
                  <div class="module-info">
                    <span class="module-path">{module.filePath}</span>
                  </div>
                  <div class="module-stats">
                    <span class="delta-decrease">-{formatBytes(module.bundledSize)}</span>
                  </div>
                </div>
              {/each}
              {#if comparison.moduleDiff.removed.length > 20}
                <p class="more-items">
                  ... and {comparison.moduleDiff.removed.length - 20} more
                </p>
              {/if}
            </div>
          </div>
        {/if}
      </section>
    {/if}
  </div>
</DashboardLayout>

<style>
  .comparison-container {
    margin: 0 auto;
    width: 100%;
    max-width: 80rem;
    padding: 1.5rem 1rem;
  }

  .comparison-header {
    margin-bottom: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .analysis-selector {
    margin-bottom: 2rem;
    display: flex;
    align-items: flex-end;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .selector-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    flex: 1;
    min-width: 250px;
  }

  .selector-group label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #4b5563;
  }

  @media (prefers-color-scheme: dark) {
    .selector-group label {
      color: #9ca3af;
    }
  }

  .selector-group select {
    padding: 0.5rem;
    border-radius: 0.375rem;
    border: 1px solid #d1d5db;
    background-color: #ffffff;
    font-size: 0.875rem;
    color: #111827;
  }

  @media (prefers-color-scheme: dark) {
    .selector-group select {
      border-color: #4b5563;
      background-color: #1f2937;
      color: #ffffff;
    }
  }

  .selector-arrow {
    font-size: 1.5rem;
    color: #6b7280;
    padding-bottom: 0.5rem;
  }

  @media (prefers-color-scheme: dark) {
    .selector-arrow {
      color: #9ca3af;
    }
  }

  .stats-section {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
    margin-bottom: 2rem;
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

  .changes-section {
    margin-top: 2rem;
  }

  .changes-section > h2 {
    margin-bottom: 1.5rem;
    font-size: 1.5rem;
    font-weight: bold;
    color: #111827;
  }

  @media (prefers-color-scheme: dark) {
    .changes-section > h2 {
      color: #ffffff;
    }
  }

  .change-group {
    margin-bottom: 2rem;
  }

  .change-group-title {
    margin-bottom: 1rem;
    font-size: 1.125rem;
    font-weight: 600;
    color: #111827;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  @media (prefers-color-scheme: dark) {
    .change-group-title {
      color: #ffffff;
    }
  }

  .change-badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  .change-badge.change-added {
    background-color: #dcfce7;
    color: #166534;
  }

  @media (prefers-color-scheme: dark) {
    .change-badge.change-added {
      background-color: #14532d;
      color: #86efac;
    }
  }

  .change-badge.change-removed {
    background-color: #fee2e2;
    color: #991b1b;
  }

  @media (prefers-color-scheme: dark) {
    .change-badge.change-removed {
      background-color: #7f1d1d;
      color: #fca5a5;
    }
  }

  .change-badge.change-modified {
    background-color: #dbeafe;
    color: #1e40af;
  }

  @media (prefers-color-scheme: dark) {
    .change-badge.change-modified {
      background-color: #1e3a8a;
      color: #93c5fd;
    }
  }

  .module-list {
    border-radius: 0.5rem;
    border: 1px solid #e5e7eb;
    background-color: #ffffff;
    overflow: hidden;
  }

  @media (prefers-color-scheme: dark) {
    .module-list {
      border-color: #374151;
      background-color: #1f2937;
    }
  }

  .module-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #e5e7eb;
    gap: 1rem;
  }

  @media (prefers-color-scheme: dark) {
    .module-item {
      border-bottom-color: #374151;
    }
  }

  .module-item:last-child {
    border-bottom: none;
  }

  .module-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    min-width: 0;
  }

  .module-path {
    font-family: 'Courier New', monospace;
    font-size: 0.875rem;
    color: #111827;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media (prefers-color-scheme: dark) {
    .module-path {
      color: #e5e7eb;
    }
  }

  .export-badge {
    display: inline-block;
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    background-color: #fef3c7;
    color: #92400e;
    flex-shrink: 0;
  }

  @media (prefers-color-scheme: dark) {
    .export-badge {
      background-color: #78350f;
      color: #fde68a;
    }
  }

  .module-stats {
    font-size: 0.875rem;
    font-weight: 600;
    white-space: nowrap;
  }

  .more-items {
    padding: 0.75rem 1rem;
    text-align: center;
    font-size: 0.875rem;
    font-style: italic;
    color: #6b7280;
  }

  @media (prefers-color-scheme: dark) {
    .more-items {
      color: #9ca3af;
    }
  }
</style>
