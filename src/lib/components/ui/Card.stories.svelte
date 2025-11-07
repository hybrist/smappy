<script context="module">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Card from './Card.svelte';

  const { Story } = defineMeta({
    title: 'UI/Card',
    component: Card,
    tags: ['autodocs'],
    argTypes: {
      class: {
        control: 'text',
        description: 'Additional CSS classes',
      },
    },
  });
</script>

<script>
  import { dedent } from 'ts-dedent';
</script>

<!--
  @component Card Stories

  Showcases the Card component with different use cases and variations.
-->

<Story name="Default">
  <Card>
    <h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">Card Title</h3>
    <p class="text-gray-600 dark:text-gray-400">
      This is a basic card with default styling. It includes padding, rounded corners, border, and
      shadow.
    </p>
  </Card>
</Story>

<Story name="With Custom Content">
  <Card>
    <div class="space-y-4">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Project Metrics</h3>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <p class="text-sm text-gray-600 dark:text-gray-400">Total Size</p>
          <p class="text-xl font-bold text-gray-900 dark:text-white">2.5 MB</p>
        </div>
        <div>
          <p class="text-sm text-gray-600 dark:text-gray-400">Modules</p>
          <p class="text-xl font-bold text-gray-900 dark:text-white">142</p>
        </div>
      </div>
    </div>
  </Card>
</Story>

<Story name="Interactive Card">
  <Card class="transition-shadow hover:shadow-md">
    <h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">Hover me!</h3>
    <p class="text-gray-600 dark:text-gray-400">
      This card has a hover effect with increased shadow. Perfect for clickable cards.
    </p>
  </Card>
</Story>

<Story name="Minimal Card">
  <Card class="p-4">
    <p class="text-sm text-gray-600 dark:text-gray-400">
      A card with reduced padding using custom classes.
    </p>
  </Card>
</Story>

<Story name="Grid Layout">
  <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
    <Card>
      <h4 class="font-semibold text-gray-900 dark:text-white">Card 1</h4>
      <p class="text-sm text-gray-600 dark:text-gray-400">First card in grid</p>
    </Card>
    <Card>
      <h4 class="font-semibold text-gray-900 dark:text-white">Card 2</h4>
      <p class="text-sm text-gray-600 dark:text-gray-400">Second card in grid</p>
    </Card>
    <Card>
      <h4 class="font-semibold text-gray-900 dark:text-white">Card 3</h4>
      <p class="text-sm text-gray-600 dark:text-gray-400">Third card in grid</p>
    </Card>
  </div>
</Story>
