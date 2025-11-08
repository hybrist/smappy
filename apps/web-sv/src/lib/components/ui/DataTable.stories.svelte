<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import DataTable from './DataTable.svelte';

  const { Story } = defineMeta({
    title: 'UI/DataTable',
    component: DataTable,
    tags: ['autodocs'],
  });
</script>

<script lang="ts">
  // Sample data
  const modules = [
    { name: 'App.tsx', size: '45 KB', type: 'tsx', source: 'source' },
    { name: 'Button.tsx', size: '12 KB', type: 'tsx', source: 'source' },
    { name: 'react', size: '120 KB', type: 'js', source: 'third-party' },
    { name: 'lodash', size: '72 KB', type: 'js', source: 'third-party' },
  ];

  const dependencies = [
    { module: 'App.tsx', imports: 8, exports: 2, circular: false },
    { module: 'Button.tsx', imports: 3, exports: 1, circular: false },
    { module: 'utils/helpers.ts', imports: 12, exports: 8, circular: true },
    { module: 'services/api.ts', imports: 5, exports: 3, circular: false },
  ];

  const suggestions = [
    { severity: 'critical', title: 'Large module detected', module: 'App.tsx', impact: 'High' },
    { severity: 'warning', title: 'Unused exports', module: 'utils.ts', impact: 'Medium' },
    { severity: 'info', title: 'Code splitting opportunity', module: 'Chart.tsx', impact: 'Low' },
  ];

  // Sort state
  let sortKey: 'name' | 'size' | 'type' | 'source' = $state('name');
  let sortDirection: 'asc' | 'desc' = $state('asc');

  function handleSort(key: 'name' | 'size' | 'type' | 'source') {
    if (sortKey === key) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortKey = key;
      sortDirection = 'asc';
    }
  }
</script>

<!--
  @component DataTable Stories

  Showcases the DataTable component with different data and configurations.
-->

<Story name="Basic Table">
  <DataTable
    columns={[
      { header: 'Name', key: 'name' },
      { header: 'Size', key: 'size' },
      { header: 'Type', key: 'type' },
    ]}
    data={modules}
  />
</Story>

<Story name="Sortable Columns">
  <DataTable
    columns={[
      { header: 'Name', key: 'name', sortable: true },
      { header: 'Size', key: 'size', sortable: true },
      { header: 'Type', key: 'type' },
    ]}
    data={modules}
    {sortKey}
    {sortDirection}
    onSort={handleSort}
  />
</Story>

<Story name="All Columns">
  <DataTable
    columns={[
      { header: 'Name', key: 'name', sortable: true },
      { header: 'Size', key: 'size', sortable: true },
      { header: 'Type', key: 'type' },
      { header: 'Source', key: 'source' },
    ]}
    data={modules}
  />
</Story>

<Story name="Dependencies Table">
  <DataTable
    columns={[
      { header: 'Module', key: 'module', sortable: true },
      { header: 'Imports', key: 'imports', sortable: true, width: 'w-24' },
      { header: 'Exports', key: 'exports', sortable: true, width: 'w-24' },
      { header: 'Circular', key: 'circular', width: 'w-24' },
    ]}
    data={dependencies}
  />
</Story>

<Story name="Suggestions Table">
  <DataTable
    columns={[
      { header: 'Severity', key: 'severity', width: 'w-32' },
      { header: 'Title', key: 'title', sortable: true },
      { header: 'Module', key: 'module' },
      { header: 'Impact', key: 'impact', width: 'w-24' },
    ]}
    data={suggestions}
  />
</Story>

<Story name="Empty Table">
  <DataTable
    columns={[
      { header: 'Name', key: 'name' },
      { header: 'Value', key: 'value' },
    ]}
    data={[]}
  />
</Story>

<Story name="Wide Table (Scrollable)">
  <DataTable
    columns={[
      { header: 'Module Name', key: 'name', sortable: true },
      { header: 'Size (Original)', key: 'size' },
      { header: 'Size (Gzipped)', key: 'size' },
      { header: 'Type', key: 'type' },
      { header: 'Source', key: 'source' },
      { header: 'Imports', key: 'size' },
      { header: 'Exports', key: 'size' },
      { header: 'Tree-shakeable', key: 'type' },
    ]}
    data={modules}
  />
</Story>
