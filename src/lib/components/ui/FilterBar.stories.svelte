<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import FilterBar from './FilterBar.svelte';

  const { Story } = defineMeta({
    title: 'UI/FilterBar',
    component: FilterBar,
    tags: ['autodocs'],
    argTypes: {
      searchPlaceholder: {
        control: 'text',
      },
    },
  });
</script>

<script>
  import Badge from './Badge.svelte';
  import Button from './Button.svelte';

  let searchValue = $state('');
  let searchWithFiltersValue = $state('');
  let sourceFilter = $state('all');
  let typeFilter = $state('all');
</script>

<!--
  @component FilterBar Stories

  Showcases the FilterBar component with various filter configurations.
-->

<Story name="Search Only">
  <FilterBar bind:search={searchValue} searchPlaceholder="Search modules..." />
  <div class="mt-4 text-sm text-gray-600 dark:text-gray-400">
    Current search: <strong>{searchValue || '(empty)'}</strong>
  </div>
</Story>

<Story name="Search with Dropdowns">
  <FilterBar bind:search={searchWithFiltersValue} searchPlaceholder="Search files...">
    {#snippet filters()}
      <select
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        bind:value={sourceFilter}
      >
        <option value="all">All Sources</option>
        <option value="source">Source Only</option>
        <option value="third-party">Third-party Only</option>
      </select>
      <select
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        bind:value={typeFilter}
      >
        <option value="all">All Types</option>
        <option value="js">JavaScript</option>
        <option value="ts">TypeScript</option>
        <option value="css">CSS</option>
      </select>
    {/snippet}
  </FilterBar>
  <div class="mt-4 text-sm text-gray-600 dark:text-gray-400">
    Filters: <strong>{sourceFilter}</strong>, <strong>{typeFilter}</strong>, Search:
    <strong>{searchWithFiltersValue || '(empty)'}</strong>
  </div>
</Story>

<Story name="With Badge Filters">
  <FilterBar searchPlaceholder="Search dependencies...">
    {#snippet filters()}
      <div class="flex flex-wrap gap-2">
        <Badge variant="source">Source</Badge>
        <Badge variant="third-party">Third-party</Badge>
        <Badge variant="entry">Entry</Badge>
      </div>
    {/snippet}
  </FilterBar>
</Story>

<Story name="With Action Button">
  <FilterBar searchPlaceholder="Search suggestions...">
    {#snippet filters()}
      <Button variant="primary">Generate</Button>
    {/snippet}
  </FilterBar>
</Story>

<Story name="Complex Filters">
  <FilterBar searchPlaceholder="Filter by name, path, or size...">
    {#snippet filters()}
      <select
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
      >
        <option>All Sources</option>
        <option>Source</option>
        <option>Third-party</option>
      </select>
      <select
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
      >
        <option>All Types</option>
        <option>JS/TS</option>
        <option>CSS</option>
        <option>Assets</option>
      </select>
      <select
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
      >
        <option>Any Size</option>
        <option>&gt; 100 KB</option>
        <option>&gt; 500 KB</option>
        <option>&gt; 1 MB</option>
      </select>
      <Button variant="secondary">Reset</Button>
    {/snippet}
  </FilterBar>
</Story>

<Story name="Minimal">
  <FilterBar />
</Story>
