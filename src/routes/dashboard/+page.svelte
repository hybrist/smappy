<script lang="ts">
  import { goto } from '$app/navigation';
  import Card from '$lib/components/ui/Card.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';

  let { data } = $props();

  const projects = $derived(data.projects);

  function handleProjectSelect(projectName: string) {
    goto(`/dashboard/${encodeURIComponent(projectName)}`);
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
        {#each projects as project (project)}
          <button
            class="block w-full cursor-pointer"
            onclick={() => handleProjectSelect(project)}
            data-testid="project-card"
          >
            <Card class="h-full transition-shadow hover:shadow-lg">
              <div class="flex flex-col gap-2">
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                  {project}
                </h2>
                <p class="text-sm text-primary-600 dark:text-primary-400">View Analysis →</p>
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
