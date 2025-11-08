<script lang="ts">
  import { goto } from '$app/navigation';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';

  type ProjectSummary = {
    name: string;
    bundler: string | null;
    moduleCount: number | null;
    bundleCount: number | null;
    totalSize: number | null;
    totalGzipSize: number | null;
    lastAnalyzedAt: string | null;
    changePercent: number | null;
    isStale: boolean;
  };

  let { data } = $props();

  const projects = $derived(data.projects as ProjectSummary[]);

  function handleProjectSelect(projectName: string) {
    goto(`/dashboard/${encodeURIComponent(projectName)}`);
  }

  function formatBytes(bytes: number | null): string {
    if (bytes === null || bytes === undefined) {
      return 'Unknown size';
    }
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
    const value = bytes / Math.pow(k, i);
    return `${parseFloat(value.toFixed(value >= 10 || i === 0 ? 0 : 1))} ${sizes[i]}`;
  }

  function formatModuleCount(count: number | null): string {
    if (count === null || count === undefined) {
      return 'Unknown modules';
    }
    const unit = count === 1 ? 'module' : 'modules';
    return `${count} ${unit}`;
  }

  function formatLastAnalyzed(lastAnalyzedAt: string | null): string {
    if (!lastAnalyzedAt) {
      return 'Never analyzed';
    }

    const date = new Date(lastAnalyzedAt);
    if (Number.isNaN(date.getTime())) {
      return 'Unknown';
    }

    const diffMs = Date.now() - date.getTime();
    const diffSeconds = Math.round(diffMs / 1000);

    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

    if (Math.abs(diffSeconds) < 60) {
      return 'Just now';
    }

    const diffMinutes = Math.round(diffSeconds / 60);
    if (Math.abs(diffMinutes) < 60) {
      return rtf.format(-diffMinutes, 'minute');
    }

    const diffHours = Math.round(diffMinutes / 60);
    if (Math.abs(diffHours) < 24) {
      return rtf.format(-diffHours, 'hour');
    }

    const diffDays = Math.round(diffHours / 24);
    if (Math.abs(diffDays) < 30) {
      return rtf.format(-diffDays, 'day');
    }

    const diffMonths = Math.round(diffDays / 30);
    if (Math.abs(diffMonths) < 12) {
      return rtf.format(-diffMonths, 'month');
    }

    const diffYears = Math.round(diffMonths / 12);
    return rtf.format(-diffYears, 'year');
  }

  function getTrend(changePercent: number | null) {
    if (changePercent === null) {
      return null;
    }

    const rounded = Math.abs(changePercent) >= 0.1 ? changePercent : 0;
    const direction = rounded > 0 ? 'increase' : rounded < 0 ? 'decrease' : 'flat';
    const symbol = direction === 'increase' ? '↑' : direction === 'decrease' ? '↓' : '→';
    const tone =
      direction === 'increase' ? 'negative' : direction === 'decrease' ? 'positive' : 'neutral';
    const displayValue =
      direction === 'flat'
        ? 'No change'
        : `${Math.abs(changePercent).toFixed(Math.abs(changePercent) >= 10 ? 0 : 1)}%`;

    return {
      direction,
      symbol,
      tone,
      displayValue,
    };
  }
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-900">
  <div class="w-full max-w-4xl">
    <div class="mb-8 flex flex-col items-center gap-4">
      <img src="/logo.svg" alt="Smappy" class="h-16" />
      <p class="text-gray-600 dark:text-gray-400">Select a project to view its analysis data</p>
    </div>

    {#if projects.length > 0}
      <div class="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list">
        {#each projects as project (project.name)}
          {@const trend = getTrend(project.changePercent)}
          <button
            class="block w-full cursor-pointer"
            onclick={() => handleProjectSelect(project.name)}
            data-testid="project-card"
          >
            <Card class="h-full transition-shadow hover:shadow-lg">
              <div class="flex flex-col gap-3 text-left">
                <div class="flex items-start justify-between gap-2">
                  <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                    {project.name}
                  </h2>
                  {#if project.bundler}
                    <Badge variant="info" class="shrink-0 tracking-wide uppercase">
                      {project.bundler}
                    </Badge>
                  {/if}
                </div>

                <div
                  class="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
                >
                  <span data-testid="project-card-size">{formatBytes(project.totalSize)}</span>
                  <span aria-hidden="true">•</span>
                  <span data-testid="project-card-modules"
                    >{formatModuleCount(project.moduleCount)}</span
                  >
                </div>

                <div class="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span
                    class="text-gray-500 dark:text-gray-400"
                    data-testid="project-card-last-analyzed"
                  >
                    Last analyzed: {formatLastAnalyzed(project.lastAnalyzedAt)}
                  </span>
                  {#if trend}
                    <span
                      class={`flex items-center gap-1 font-medium ${
                        trend.tone === 'negative'
                          ? 'dark:text-error-400 text-error-600'
                          : trend.tone === 'positive'
                            ? 'dark:text-success-400 text-success-600'
                            : 'text-gray-500 dark:text-gray-400'
                      }`}
                      data-testid="project-card-trend"
                    >
                      <span aria-hidden="true">{trend.symbol}</span>
                      <span>{trend.displayValue}</span>
                    </span>
                  {/if}
                </div>

                {#if project.isStale}
                  <Badge variant="warning" class="w-fit" data-testid="project-card-stale">
                    Stale data
                  </Badge>
                {/if}

                <p
                  class="text-sm font-medium text-primary-600 transition-colors dark:text-primary-400"
                >
                  View Analysis →
                </p>
              </div>
            </Card>
          </button>
        {/each}
      </div>
    {:else}
      <EmptyState
        data-testid="empty-state-no-projects"
        title="No projects found"
        description="Run an analysis to get started."
      />
    {/if}
  </div>
</div>
