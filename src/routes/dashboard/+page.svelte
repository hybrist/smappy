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
          <button class="project-card" onclick={() => handleProjectSelect(project)}>
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

  .landing-title {
    margin-bottom: 0.5rem;
    text-align: center;
    font-size: 1.875rem;
    font-weight: bold;
    color: #111827;
  }

  @media (prefers-color-scheme: dark) {
    .landing-title {
      color: #ffffff;
    }
  }

  .landing-description {
    margin-bottom: 2rem;
    text-align: center;
    color: #4b5563;
  }

  @media (prefers-color-scheme: dark) {
    .landing-description {
      color: #9ca3af;
    }
  }

  .project-list {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
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

  .project-card {
    width: 100%;
    cursor: pointer;
    border-radius: 0.5rem;
    border: 1px solid #e5e7eb;
    background-color: #ffffff;
    padding: 1.5rem;
    text-align: left;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    transition: box-shadow 0.2s;
  }

  .project-card:hover {
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  }

  @media (prefers-color-scheme: dark) {
    .project-card {
      border-color: #374151;
      background-color: #1f2937;
    }
  }

  .project-name {
    margin-bottom: 0.5rem;
    font-size: 1.125rem;
    font-weight: 600;
    color: #111827;
  }

  @media (prefers-color-scheme: dark) {
    .project-name {
      color: #ffffff;
    }
  }

  .project-action {
    font-size: 0.875rem;
    color: #2563eb;
  }

  @media (prefers-color-scheme: dark) {
    .project-action {
      color: #60a5fa;
    }
  }

  .empty-state {
    border-radius: 0.5rem;
    border: 1px solid #e5e7eb;
    background-color: #ffffff;
    padding: 2rem;
    text-align: center;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  }

  @media (prefers-color-scheme: dark) {
    .empty-state {
      border-color: #374151;
      background-color: #1f2937;
    }
  }

  .empty-state p {
    color: #4b5563;
  }

  @media (prefers-color-scheme: dark) {
    .empty-state p {
      color: #9ca3af;
    }
  }
</style>
