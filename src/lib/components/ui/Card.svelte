<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    /**
     * Additional CSS classes to apply to the card
     */
    class?: string;
    /**
     * Card content
     */
    children?: Snippet;
    /**
     * Additional HTML attributes
     */
    [key: string]: unknown;
  }

  let { class: className = '', children, ...props }: Props = $props();
</script>

<!--
  @component Card

  Generic card container with rounded corners, border, and shadow.
  Uses Tailwind design tokens for consistent styling across the application.

  @example
  ```svelte
  <Card>
    <h2>Card Title</h2>
    <p>Card content goes here</p>
  </Card>

  <!-- With custom classes -->
<Card class="transition-shadow hover:shadow-lg">Interactive card</Card>
``` -->

<div
  class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 {className}"
  {...props}
>
  {@render children?.()}
</div>
