<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    /**
     * Optional section title
     */
    title?: string;
    /**
     * Whether to show a border
     */
    bordered?: boolean;
    /**
     * Additional CSS classes
     */
    class?: string;
    /**
     * Section content
     */
    children?: Snippet;
    /**
     * Additional HTML attributes
     */
    [key: string]: unknown;
  }

  let { title, bordered = false, class: className = '', children, ...props }: Props = $props();

  const borderClass = bordered ? 'border border-gray-200 dark:border-gray-700' : '';
</script>

<!--
  @component Section

  Content section wrapper with optional title and border.
  Provides a consistent container for grouped content.

  @example
  ```svelte
  <!-- Basic section -->
<Section>
  <p>Section content</p>
</Section>

<!-- With title -->
<Section title="Top Modules">
  <p>Module list here</p>
</Section>

<!-- With border -->
<Section title="Bundle Metrics" bordered>
  <p>Metrics content</p>
</Section>
``` -->

<section class="rounded-lg bg-gray-50 p-6 dark:bg-gray-900 {borderClass} {className}" {...props}>
  {#if title}
    <h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
  {/if}
  {@render children?.()}
</section>
