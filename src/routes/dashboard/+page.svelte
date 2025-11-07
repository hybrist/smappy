<script lang="ts">
  import { goto } from '$app/navigation';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';

  let { data } = $props();

  const projects = $derived(data.projects);

  function handleProjectSelect(projectName: string) {
    goto(`/dashboard/${encodeURIComponent(projectName)}`);
  }
</script>

<div class="dashboard-landing">
  <div class="landing-content">
    <PageHeader
      title="Bundle Analysis Dashboard"
      description="Select a project to view its analysis data"
    />

    {#if projects.length > 0}
      <div class="project-list" role="list">
        {#each projects as project (project)}
          <button
            class="project-card-button"
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

<style>
  .dashboard-landing {
    display: flex;
    min-height: 100vh;
    align-items: center;
    justify-content: center;
    padding: 3rem 1rem;
    background-color: #f9fafb;
  }

  @media (prefers-color-scheme: dark) {
    .dashboard-landing {
      background-color: #111827;
    }
  }

  .landing-content {
    width: 100%;
    max-width: 56rem;
  }

  .project-list {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
    margin-top: 2rem;
  }

  @media (min-width: 640px) {
    .project-list {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (min-width: 1024px) {
    .project-list {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  .project-card-button {
    all: unset;
    cursor: pointer;
    width: 100%;
    display: block;
  }
</style>
