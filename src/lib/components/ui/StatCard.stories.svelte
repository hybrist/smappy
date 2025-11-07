<script context="module">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import StatCard from './StatCard.svelte';

  const { Story } = defineMeta({
    title: 'UI/StatCard',
    component: StatCard,
    tags: ['autodocs'],
    argTypes: {
      title: {
        control: 'text',
      },
      value: {
        control: 'text',
      },
      subtitle: {
        control: 'text',
      },
    },
  });
</script>

<!--
  @component StatCard Stories

  Showcases the StatCard component for displaying metrics.
-->

<Story name="Basic Stat">
  <StatCard title="Total Size" value="2.5 MB" />
</Story>

<Story name="With Subtitle">
  <StatCard title="Total Size" value="2.5 MB" subtitle="Gzip: 890 KB" />
</Story>

<Story name="Numeric Values">
  <StatCard title="Modules" value={142} />
</Story>

<Story name="Dashboard Grid">
  <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
    <StatCard title="Total Size" value="2.5 MB" subtitle="Gzip: 890 KB" />
    <StatCard title="Modules" value={142} subtitle="8 entry points" />
    <StatCard title="Dependencies" value={45} subtitle="23 unique packages" />
  </div>
</Story>

<Story name="Large Numbers">
  <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
    <StatCard title="Lines of Code" value="142,358" />
    <StatCard title="Bundle Size" value="15.8 MB" subtitle="3.2 MB gzipped" />
  </div>
</Story>

<Story name="Small Values">
  <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
    <StatCard title="Circular Dependencies" value={0} subtitle="None detected" />
    <StatCard title="Entry Points" value={3} />
    <StatCard title="Chunks" value={12} />
    <StatCard title="Tree-shakeable" value="94%" />
  </div>
</Story>

<Story name="With Custom Styling">
  <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
    <StatCard
      title="Critical Issues"
      value={3}
      subtitle="Requires attention"
      class="border-l-4 border-error-500"
    />
    <StatCard
      title="Optimizations Available"
      value={8}
      subtitle="Potential savings: 1.2 MB"
      class="border-l-4 border-success-500"
    />
  </div>
</Story>
