<script lang="ts">
  import { goto } from '$app/navigation';

  let { projects, projectName } = $props();

  // eslint-disable-next-line svelte/no-navigation-without-resolve
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
    @apply flex-1;
  }

  .project-select {
    @apply w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white;
  }

  .sr-only {
    @apply sr-only;
  }
</style>
