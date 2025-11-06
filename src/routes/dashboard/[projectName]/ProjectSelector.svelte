<script lang="ts">
  import { goto } from '$app/navigation';

  let { projects, projectName } = $props();

  function handleProjectChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const newProjectName = target.value;
    if (newProjectName && newProjectName !== projectName) {
      goto(`/dashboard/${encodeURIComponent(newProjectName)}`);
    }
  }
</script>

<div class="project-selector">
  <label for="project-select" class="sr-only">Select Project</label>
  <select
    id="project-select"
    value={projectName || ''}
    onchange={handleProjectChange}
    class="project-select"
    aria-label="Select Project"
  >
    {#if !projectName}
      <option value="">-- Select a project --</option>
    {/if}
    {#each projects as project (project)}
      <option value={project} selected={project === projectName}>
        {project}
      </option>
    {/each}
  </select>
</div>

<style>
  .project-selector {
    flex: 1;
  }

  .project-select {
    width: 100%;
    border-radius: 0.5rem;
    border: 1px solid #d1d5db;
    background-color: #ffffff;
    padding: 0.5rem 1rem;
    color: #111827;
    outline: none;
  }

  .project-select:focus {
    border-color: transparent;
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }

  @media (prefers-color-scheme: dark) {
    .project-select {
      border-color: #4b5563;
      background-color: #1f2937;
      color: #ffffff;
    }
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }
</style>
