<script lang="ts" generics="T extends Record<string, unknown>">
  import type { Snippet } from 'svelte';

  interface Column<T> {
    /**
     * Column header label
     */
    header: string;
    /**
     * Data key to access value from row
     */
    key: keyof T;
    /**
     * Whether this column is sortable
     */
    sortable?: boolean;
    /**
     * Optional custom cell renderer
     */
    cell?: Snippet<[T]>;
    /**
     * Optional column width class
     */
    width?: string;
  }

  interface Props {
    /**
     * Table columns configuration
     */
    columns: Column<T>[];
    /**
     * Table data rows
     */
    data: T[];
    /**
     * Current sort column key
     */
    sortKey?: keyof T;
    /**
     * Current sort direction
     */
    sortDirection?: 'asc' | 'desc';
    /**
     * Sort change handler
     */
    onSort?: (key: keyof T) => void;
    /**
     * Additional CSS classes
     */
    class?: string;
    /**
     * Additional HTML attributes
     */
    [key: string]: unknown;
  }

  let {
    columns,
    data,
    sortKey,
    sortDirection = 'asc',
    onSort,
    class: className = '',
    ...props
  }: Props = $props();

  function handleSort(column: Column<T>) {
    if (column.sortable && onSort) {
      onSort(column.key);
    }
  }
</script>

<!--
  @component DataTable

  Flexible data table component with sorting and custom cell rendering.
  Responsive with horizontal scroll on small screens.

  See DataTable.stories.svelte for usage examples.
-->

<div
  class="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 {className}"
  {...props}
>
  <div class="overflow-x-auto">
    <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
      <thead class="bg-gray-50 dark:bg-gray-800">
        <tr>
          {#each columns as column (column.key)}
            <th
              class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-700 uppercase dark:text-gray-300 {column.width ||
                ''}"
              class:cursor-pointer={column.sortable}
              onclick={() => handleSort(column)}
              role={column.sortable ? 'button' : undefined}
              tabindex={column.sortable ? 0 : undefined}
            >
              <div class="flex items-center gap-2">
                <span>{column.header}</span>
                {#if column.sortable && sortKey === column.key}
                  <svg
                    class="h-4 w-4 text-gray-500 dark:text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {#if sortDirection === 'asc'}
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M5 15l7-7 7 7"
                      />
                    {:else}
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 9l-7 7-7-7"
                      />
                    {/if}
                  </svg>
                {/if}
              </div>
            </th>
          {/each}
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
        {#each data as row, i (i)}
          <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/50">
            {#each columns as column (column.key)}
              <td class="px-6 py-4 text-sm whitespace-nowrap text-gray-900 dark:text-gray-100">
                {#if column.cell}
                  {@render column.cell(row)}
                {:else}
                  {row[column.key]}
                {/if}
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
