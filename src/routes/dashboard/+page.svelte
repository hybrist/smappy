<script lang="ts">
  import { goto } from '$app/navigation';

  let { data } = $props();

  const projects = $derived(data.projects);

  function handleProjectSelect(projectName: string) {
    // eslint-disable-next-line svelte/no-navigation-without-resolve
    goto(`/dashboard/${encodeURIComponent(projectName)}`);
  }
</script>

<div class="dashboard-landing">
  <div class="landing-content">
    <h1 class="landing-title">Bundle Analysis Dashboard</h1>
    <p class="landing-description">Select a project to view its analysis data</p>

    {#if projects.length > 0}
      <div class="project-list" role="list">
        {#each projects as project (project)}
          <button class="project-card" onclick={() => handleProjectSelect(project)} role="listitem">
            <h2 class="project-name">{project}</h2>
            <p class="project-action">View Analysis →</p>
          </button>
        {/each}
      </div>
    {:else}
      <div class="empty-state" role="alert">
        <p>No projects found. Run an analysis to get started.</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .dashboard-landing {
    @apply flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-900;
  }

  .landing-content {
    @apply w-full max-w-4xl;
  }

  .landing-title {
    @apply mb-2 text-center text-3xl font-bold text-gray-900 dark:text-white;
  }

  .landing-description {
    @apply mb-8 text-center text-gray-600 dark:text-gray-400;
  }

  .project-list {
    @apply grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3;
  }

  .project-card {
    @apply w-full cursor-pointer rounded-lg border border-gray-200 bg-white p-6 text-left shadow transition-shadow hover:shadow-lg dark:border-gray-700 dark:bg-gray-800;
  }

  .project-name {
    @apply mb-2 text-lg font-semibold text-gray-900 dark:text-white;
  }

  .project-action {
    @apply text-sm text-blue-600 dark:text-blue-400;
  }

  .empty-state {
    @apply rounded-lg border border-gray-200 bg-white p-8 text-center shadow dark:border-gray-700 dark:bg-gray-800;
  }

  .empty-state p {
    @apply text-gray-600 dark:text-gray-400;
  }
</style>
