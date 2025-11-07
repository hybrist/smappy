<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    /**
     * Page title
     */
    title: string;
    /**
     * Optional page description
     */
    description?: string;
    /**
     * Optional actions slot (buttons, links, etc.)
     */
    actions?: Snippet;
    /**
     * Additional CSS classes
     */
    class?: string;
    /**
     * Additional HTML attributes
     */
    [key: string]: unknown;
  }

  let { title, description, actions, class: className = '', ...props }: Props = $props();
</script>

<!--
  @component PageHeader

  Page header component with title, optional description, and actions.
  Provides consistent page titles across the application.

  See PageHeader.stories.svelte for usage examples.
-->

<header class="mb-6 {className}" {...props}>
  <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
    <div class="flex flex-col gap-2">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">{title}</h1>
      {#if description}
        <p class="text-gray-600 dark:text-gray-400">{description}</p>
      {/if}
    </div>
    {#if actions}
      <div class="flex items-center gap-2">
        {@render actions()}
      </div>
    {/if}
  </div>
</header>
