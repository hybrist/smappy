<script context="module">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Badge from './Badge.svelte';

  const { Story } = defineMeta({
    title: 'UI/Badge',
    component: Badge,
    tags: ['autodocs'],
    argTypes: {
      variant: {
        control: 'select',
        options: ['filetype', 'source', 'third-party', 'critical', 'warning', 'info', 'entry'],
      },
    },
  });
</script>

<!--
  @component Badge Stories

  Showcases all Badge variants with their semantic colors.
-->

<Story name="All Variants">
  <div class="flex flex-wrap gap-2">
    <Badge variant="filetype">tsx</Badge>
    <Badge variant="source">Source</Badge>
    <Badge variant="third-party">Third-party</Badge>
    <Badge variant="critical">Critical</Badge>
    <Badge variant="warning">Warning</Badge>
    <Badge variant="info">Info</Badge>
    <Badge variant="entry">Entry</Badge>
  </div>
</Story>

<Story name="File Types">
  <div class="flex flex-wrap gap-2">
    <Badge variant="filetype">js</Badge>
    <Badge variant="filetype">ts</Badge>
    <Badge variant="filetype">jsx</Badge>
    <Badge variant="filetype">tsx</Badge>
    <Badge variant="filetype">css</Badge>
    <Badge variant="filetype">json</Badge>
  </div>
</Story>

<Story name="Source Types">
  <div class="flex flex-col gap-2">
    <div class="flex items-center gap-2">
      <Badge variant="source">Source</Badge>
      <span class="text-sm text-gray-600 dark:text-gray-400">First-party application code</span>
    </div>
    <div class="flex items-center gap-2">
      <Badge variant="third-party">Third-party</Badge>
      <span class="text-sm text-gray-600 dark:text-gray-400">External dependencies</span>
    </div>
  </div>
</Story>

<Story name="Severity Levels">
  <div class="flex flex-col gap-2">
    <div class="flex items-center gap-2">
      <Badge variant="critical">Critical</Badge>
      <span class="text-sm text-gray-600 dark:text-gray-400">Urgent attention required</span>
    </div>
    <div class="flex items-center gap-2">
      <Badge variant="warning">Warning</Badge>
      <span class="text-sm text-gray-600 dark:text-gray-400">Should be reviewed</span>
    </div>
    <div class="flex items-center gap-2">
      <Badge variant="info">Info</Badge>
      <span class="text-sm text-gray-600 dark:text-gray-400">Informational</span>
    </div>
  </div>
</Story>

<Story name="Entry Points">
  <div class="flex flex-wrap gap-2">
    <Badge variant="entry">Entry</Badge>
    <Badge variant="entry">main.tsx</Badge>
    <Badge variant="entry">async</Badge>
  </div>
</Story>

<Story name="In Context">
  <div class="space-y-2">
    <div class="flex items-center gap-2">
      <span class="font-mono text-sm text-gray-900 dark:text-white">app/components/Button.tsx</span>
      <Badge variant="filetype">tsx</Badge>
      <Badge variant="source">Source</Badge>
    </div>
    <div class="flex items-center gap-2">
      <span class="font-mono text-sm text-gray-900 dark:text-white"
        >node_modules/react/index.js</span
      >
      <Badge variant="filetype">js</Badge>
      <Badge variant="third-party">Third-party</Badge>
    </div>
  </div>
</Story>
