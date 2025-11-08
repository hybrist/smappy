<script lang="ts">
  import { goto } from '$app/navigation';
  import DashboardLayout from '../DashboardLayout.svelte';
  import ProjectSelector from '../ProjectSelector.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import StatCard from '$lib/components/ui/StatCard.svelte';
  import CelebrationBanner from '$lib/components/animations/CelebrationBanner.svelte';
  import Confetti from '$lib/components/animations/Confetti.svelte';

  let { data } = $props();

  const projectName = $derived(data.projectName);
  const comparison = $derived(data.comparison);
  const projects = $derived(data.projects);
  const analysisHistory = $derived(data.analysisHistory);
  const baseId = $derived(data.baseId);
  const compareId = $derived(data.compareId);
  const hasEnoughAnalyses = $derived(data.hasEnoughAnalyses);
  const requiredAnalyses = 2;
  const missingAnalyses = $derived(Math.max(0, requiredAnalyses - analysisHistory.length));

  // Celebration state
  let showCelebration = $state(false);
  let celebrationMessage = $state('');
  let celebrationEmoji = $state('🎉');
  let celebrationVariant = $state<'success' | 'achievement' | 'milestone'>('success');
  let showConfetti = $state(false);

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

  // Check for achievements and show celebrations
  $effect(() => {
    if (comparison) {
      const totalSizeDelta = comparison.sizeDelta.totalSize;
      const baseSize = comparison.run1.totalSize ?? 0;

      if (totalSizeDelta < 0 && baseSize > 0) {
        const reductionPercent = Math.abs((totalSizeDelta / baseSize) * 100);

        // Major win: >20% reduction
        if (reductionPercent > 20) {
          celebrationEmoji = '🎉';
          celebrationMessage = `Amazing! Bundle size reduced by ${reductionPercent.toFixed(1)}%!`;
          celebrationVariant = 'achievement';
          showCelebration = true;
          showConfetti = true;
        }
        // Good improvement: 10-20% reduction
        else if (reductionPercent > 10) {
          celebrationEmoji = '🎊';
          celebrationMessage = `Great work! Bundle size reduced by ${reductionPercent.toFixed(1)}%!`;
          celebrationVariant = 'success';
          showCelebration = true;
        }
        // Any improvement
        else if (reductionPercent > 0) {
          celebrationEmoji = '✨';
          celebrationMessage = `Nice! Bundle size reduced by ${reductionPercent.toFixed(1)}%`;
          celebrationVariant = 'success';
          showCelebration = true;
        }
      }

      // Check for milestone: sub-1MB bundle
      const currentSize = comparison.run2.totalSize ?? 0;
      const previousSize = comparison.run1.totalSize ?? 0;
      const oneMB = 1024 * 1024;
      if (currentSize < oneMB && previousSize >= oneMB) {
        celebrationEmoji = '🏆';
        celebrationMessage = 'Milestone achieved: Sub-1MB bundle!';
        celebrationVariant = 'milestone';
        showCelebration = true;
        showConfetti = true;
      }
    }
  });
</script>

<DashboardLayout>
  <CelebrationBanner
    show={showCelebration}
    message={celebrationMessage}
    emoji={celebrationEmoji}
    variant={celebrationVariant}
    onDismiss={() => (showCelebration = false)}
  />
  <Confetti active={showConfetti} />

  <div class="comparison-container">
    <div class="comparison-header">
      <ProjectSelector {projects} {projectName} />
    </div>
    <PageHeader title="Analysis Comparison" />

    {#if hasEnoughAnalyses && comparison}
      <div class="analysis-selector">
        <div class="selector-group">
          <label for="base-select">Base Analysis</label>
          <select
            id="base-select"
            value={baseId ?? undefined}
            onchange={(e) => {
              if (compareId == null) return;
              handleComparisonChange(parseInt(e.currentTarget.value), compareId);
            }}
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
            value={compareId ?? undefined}
            onchange={(e) => {
              if (baseId == null) return;
              handleComparisonChange(baseId, parseInt(e.currentTarget.value));
            }}
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
    {:else}
      <section class="empty-state" aria-live="polite">
        <div class="empty-state-content">
          <div class="empty-state-emoji">📊</div>
          <h2>
            {hasEnoughAnalyses ? 'Comparison unavailable' : 'More analysis runs needed'}
          </h2>
          <p>
            {#if !hasEnoughAnalyses}
              You're on your way! Run Smappy {missingAnalyses === 1
                ? 'one more time'
                : `${missingAnalyses} more times`} to unlock comparison insights.
            {:else}
              We could not load the selected comparison. Try selecting different analyses.
            {/if}
          </p>
          {#if !hasEnoughAnalyses}
            <p class="empty-state-tip">
              💡 <strong>Pro tip:</strong> Regular analysis runs help you track bundle size over time
              and catch regressions early.
            </p>
          {/if}
          <div class="empty-state-actions">
            <a class="back-link" href={`/dashboard/${projectName}`}>Back to Overview</a>
          </div>
        </div>
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

  .empty-state {
    margin-top: 2rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.75rem;
    padding: 2rem;
    background-color: #ffffff;
    text-align: center;
  }

  @media (prefers-color-scheme: dark) {
    .empty-state {
      border-color: #374151;
      background-color: #1f2937;
    }
  }

  .empty-state-content h2 {
    font-size: 1.5rem;
    font-weight: 600;
    color: #111827;
    margin-bottom: 0.75rem;
  }

  @media (prefers-color-scheme: dark) {
    .empty-state-content h2 {
      color: #f9fafb;
    }
  }

  .empty-state-emoji {
    font-size: 3rem;
    margin-bottom: 1rem;
    animation: gentle-float 3s ease-in-out infinite;
  }

  @keyframes gentle-float {
    0%,
    100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-10px);
    }
  }

  .empty-state-content p {
    color: #4b5563;
    margin-bottom: 0.5rem;
  }

  @media (prefers-color-scheme: dark) {
    .empty-state-content p {
      color: #d1d5db;
    }
  }

  .empty-state-tip {
    margin-top: 1rem;
    padding: 1rem;
    background-color: #f3f4f6;
    border-radius: 0.5rem;
    border-left: 4px solid #3b82f6;
    text-align: left;
    max-width: 500px;
    margin-left: auto;
    margin-right: auto;
  }

  @media (prefers-color-scheme: dark) {
    .empty-state-tip {
      background-color: #374151;
      border-left-color: #60a5fa;
    }
  }

  .empty-state-secondary {
    font-size: 0.95rem;
  }

  .empty-state-actions {
    margin-top: 1.5rem;
    display: flex;
    justify-content: center;
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.75rem 1.5rem;
    border-radius: 9999px;
    background-color: #0f172a;
    color: #ffffff;
    font-weight: 600;
    text-decoration: none;
  }

  .back-link:hover {
    opacity: 0.9;
  }

  @media (prefers-color-scheme: dark) {
    .back-link {
      background-color: #6366f1;
    }
  }
</style>
