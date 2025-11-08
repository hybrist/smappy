<script lang="ts">
  import { onMount } from 'svelte';

  interface Props {
    /**
     * The target value to count up to
     */
    value: number;
    /**
     * Duration of the animation in milliseconds
     */
    duration?: number;
    /**
     * Number of decimal places to show
     */
    decimals?: number;
    /**
     * Optional formatter function
     */
    formatter?: (value: number) => string;
    /**
     * Additional CSS classes
     */
    class?: string;
  }

  let {
    value,
    duration = 1000,
    decimals = 0,
    formatter = (v: number) => v.toFixed(decimals),
    class: className = '',
  }: Props = $props();

  let displayValue = $state(0);

  onMount(() => {
    const startTime = Date.now();
    const startValue = 0;
    const endValue = value;

    const animate = () => {
      const currentTime = Date.now();
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function for smooth animation (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      displayValue = startValue + (endValue - startValue) * easeOut;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        displayValue = endValue;
      }
    };

    requestAnimationFrame(animate);
  });
</script>

<!--
  @component CountUp
  
  Animates a number counting up from 0 to a target value.
  Used for adding delight to stat displays.
-->

<span class={className}>
  {formatter(displayValue)}
</span>
