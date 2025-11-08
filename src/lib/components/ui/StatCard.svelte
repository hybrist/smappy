<script lang="ts">
  import Card from './Card.svelte';
  import CountUp from '../animations/CountUp.svelte';

  interface Props {
    /**
     * Label for the statistic
     */
    title: string;
    /**
     * The main statistic value
     */
    value: string | number;
    /**
     * Optional secondary information
     */
    subtitle?: string;
    /**
     * Enable count-up animation for numeric values
     */
    animate?: boolean;
    /**
     * Additional CSS classes for the card
     */
    class?: string;
    /**
     * Additional HTML attributes
     */
    [key: string]: unknown;
  }

  let { title, value, subtitle, animate = true, class: className = '', ...props }: Props = $props();

  // Determine if value should be animated
  const numericValue = $derived(typeof value === 'number' ? value : null);
  const shouldAnimate = $derived(animate && numericValue !== null);
</script>

<!--
  @component StatCard

  Metric display card for showing statistics with optional subtitle.
  Built on top of the Card component with hover effects for interactivity.

  See StatCard.stories.svelte for usage examples.
-->

<Card class="transition-shadow hover:shadow-md {className}" {...props}>
  <div class="flex flex-col gap-2">
    <p class="text-sm text-gray-600 dark:text-gray-400">{title}</p>
    <p class="text-2xl font-bold text-gray-900 dark:text-white">
      {#if shouldAnimate}
        <CountUp value={numericValue} />
      {:else}
        {value}
      {/if}
    </p>
    {#if subtitle}
      <p class="text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
    {/if}
  </div>
</Card>
