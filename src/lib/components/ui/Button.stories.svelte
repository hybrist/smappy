<script context="module">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Button from './Button.svelte';

  const { Story } = defineMeta({
    title: 'UI/Button',
    component: Button,
    tags: ['autodocs'],
    argTypes: {
      variant: {
        control: 'select',
        options: ['primary', 'secondary', 'ghost', 'link'],
      },
      disabled: {
        control: 'boolean',
      },
    },
  });
</script>

<script>
  let clickCount = $state(0);
</script>

<!--
  @component Button Stories

  Showcases all Button variants and states.
-->

<Story name="All Variants">
  <div class="flex flex-wrap gap-4">
    <Button variant="primary">Primary</Button>
    <Button variant="secondary">Secondary</Button>
    <Button variant="ghost">Ghost</Button>
    <Button variant="link">Link</Button>
  </div>
</Story>

<Story name="Primary Buttons">
  <div class="flex flex-wrap gap-4">
    <Button>Default Primary</Button>
    <Button disabled>Disabled</Button>
    <Button class="w-full md:w-auto">Full Width</Button>
  </div>
</Story>

<Story name="Secondary Buttons">
  <div class="flex flex-wrap gap-4">
    <Button variant="secondary">Cancel</Button>
    <Button variant="secondary" disabled>Disabled</Button>
  </div>
</Story>

<Story name="Ghost Buttons">
  <div class="flex flex-wrap gap-4">
    <Button variant="ghost">Reset</Button>
    <Button variant="ghost" disabled>Disabled</Button>
  </div>
</Story>

<Story name="Link Buttons">
  <div class="flex flex-wrap gap-4">
    <Button variant="link">Learn more →</Button>
    <Button variant="link" disabled>Disabled link</Button>
  </div>
</Story>

<Story name="Interactive">
  <div class="space-y-4">
    <div>
      <Button onclick={() => (clickCount += 1)}>
        Clicked {clickCount}
        {clickCount === 1 ? 'time' : 'times'}
      </Button>
    </div>
    <div class="text-sm text-gray-600 dark:text-gray-400">
      Click the button to increment counter
    </div>
  </div>
</Story>

<Story name="Button Groups">
  <div class="space-y-4">
    <div class="flex gap-2">
      <Button variant="secondary">Cancel</Button>
      <Button variant="primary">Save</Button>
    </div>
    <div class="flex gap-2">
      <Button variant="ghost">Back</Button>
      <Button variant="ghost">Skip</Button>
      <Button variant="primary">Next</Button>
    </div>
  </div>
</Story>

<Story name="Sizes with Custom Classes">
  <div class="flex flex-wrap items-center gap-4">
    <Button class="px-2 py-1 text-xs">Small</Button>
    <Button>Default</Button>
    <Button class="px-6 py-3 text-base">Large</Button>
  </div>
</Story>
