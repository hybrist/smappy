<script lang="ts">
  import type { Snippet } from 'svelte';
  import Card from './Card.svelte';

  interface Props {
    /**
     * Empty state title
     */
    title: string;
    /**
     * Descriptive text explaining the empty state
     */
    description: string;
    /**
     * Optional icon or illustration snippet
     */
    icon?: Snippet;
    /**
     * Optional action snippet (button, link, etc.)
     */
    action?: Snippet;
    /**
     * Additional CSS classes
     */
    class?: string;
    /**
     * Additional HTML attributes
     */
    [key: string]: unknown;
  }

  let { title, description, icon, action, class: className = '', ...props }: Props = $props();
</script>

<!--
  @component EmptyState

  Friendly empty state component for when no data is available.
  Provides clear messaging and optional call-to-action.

  See EmptyState.stories.svelte for usage examples.
-->

<Card class="text-center {className}" {...props}>
  <div class="flex flex-col items-center gap-4 py-6">
    {#if icon}
      <div class="text-gray-400 dark:text-gray-600">
        {@render icon()}
      </div>
    {/if}
    <div class="flex flex-col gap-2">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      <p class="max-w-sm text-gray-600 dark:text-gray-400">{description}</p>
    </div>
    {#if action}
      <div class="mt-2">
        {@render action()}
      </div>
    {/if}
  </div>
</Card>
