<script context="module">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Section from './Section.svelte';

  const { Story } = defineMeta({
    title: 'UI/Section',
    component: Section,
    tags: ['autodocs'],
    argTypes: {
      title: {
        control: 'text',
      },
      bordered: {
        control: 'boolean',
      },
    },
  });
</script>

<script>
  import Card from './Card.svelte';
  import StatCard from './StatCard.svelte';
</script>

<!--
  @component Section Stories

  Showcases the Section component for grouping content.
-->

<Story name="Basic Section">
  <Section>
    <p class="text-gray-600 dark:text-gray-400">
      This is a basic section without a title. It provides a light background container for grouped
      content.
    </p>
  </Section>
</Story>

<Story name="With Title">
  <Section title="Top Modules">
    <p class="text-gray-600 dark:text-gray-400">
      This section has a title. Perfect for organizing content into labeled areas.
    </p>
  </Section>
</Story>

<Story name="Bordered Section">
  <Section title="Bundle Metrics" bordered>
    <p class="text-gray-600 dark:text-gray-400">
      This section has a border for additional visual separation.
    </p>
  </Section>
</Story>

<Story name="With Nested Cards">
  <Section title="Project Statistics">
    <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
      <StatCard title="Total Size" value="2.5 MB" />
      <StatCard title="Modules" value={142} />
      <StatCard title="Dependencies" value={45} />
    </div>
  </Section>
</Story>

<Story name="With Custom Content">
  <Section title="Module Breakdown" bordered>
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <span class="text-gray-900 dark:text-white">Source Code</span>
        <span class="font-semibold text-gray-900 dark:text-white">1.2 MB</span>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-gray-900 dark:text-white">Dependencies</span>
        <span class="font-semibold text-gray-900 dark:text-white">1.3 MB</span>
      </div>
      <div class="h-px bg-gray-200 dark:bg-gray-700"></div>
      <div class="flex items-center justify-between font-bold">
        <span class="text-gray-900 dark:text-white">Total</span>
        <span class="text-gray-900 dark:text-white">2.5 MB</span>
      </div>
    </div>
  </Section>
</Story>

<Story name="Multiple Sections">
  <div class="space-y-6">
    <Section title="Overview">
      <p class="text-gray-600 dark:text-gray-400">Your project overview goes here.</p>
    </Section>

    <Section title="Metrics" bordered>
      <div class="grid grid-cols-2 gap-4">
        <StatCard title="Size" value="2.5 MB" />
        <StatCard title="Modules" value={142} />
      </div>
    </Section>

    <Section title="Details">
      <p class="text-gray-600 dark:text-gray-400">Additional details and information.</p>
    </Section>
  </div>
</Story>

<Story name="Nested Sections">
  <Section title="Bundle Analysis">
    <div class="space-y-4">
      <p class="text-gray-600 dark:text-gray-400">Main bundle analysis container.</p>

      <Card>
        <h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">Detailed Breakdown</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Cards can be used inside sections for additional visual hierarchy.
        </p>
      </Card>
    </div>
  </Section>
</Story>
