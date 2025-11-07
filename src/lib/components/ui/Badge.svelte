<script lang="ts">
  import type { Snippet } from 'svelte';

  type BadgeVariant =
    | 'filetype'
    | 'source'
    | 'third-party'
    | 'critical'
    | 'warning'
    | 'info'
    | 'entry';

  interface Props {
    /**
     * Badge variant determines the color scheme
     */
    variant?: BadgeVariant;
    /**
     * Additional CSS classes to apply
     */
    class?: string;
    /**
     * Badge content (text or components)
     */
    children?: Snippet;
    /**
     * Additional HTML attributes
     */
    [key: string]: unknown;
  }

  let { variant = 'filetype', class: className = '', children, ...props }: Props = $props();

  const variantClasses: Record<BadgeVariant, string> = {
    filetype: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    source: 'bg-success-500/10 text-success-600 dark:bg-success-500/20 dark:text-success-400',
    'third-party':
      'bg-warning-500/10 text-warning-600 dark:bg-warning-500/20 dark:text-warning-400',
    critical: 'bg-error-500/10 text-error-600 dark:bg-error-500/20 dark:text-error-400',
    warning: 'bg-warning-500/10 text-warning-600 dark:bg-warning-500/20 dark:text-warning-400',
    info: 'bg-info-500/10 text-info-600 dark:bg-info-500/20 dark:text-info-400',
    entry: 'bg-primary-500/10 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400',
  };
</script>

<!--
  @component Badge

  Label badge component with multiple variants for different use cases.
  Uses semantic colors from Tailwind theme for consistent styling.

  Variants: filetype, source, third-party, critical, warning, info, entry
  See Badge.stories.svelte for usage examples.
-->

<span
  class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {variantClasses[
    variant
  ]} {className}"
  {...props}
>
  {@render children?.()}
</span>
