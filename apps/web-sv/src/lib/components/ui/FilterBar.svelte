<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    /**
     * Search input value
     */
    search?: string;
    /**
     * Search placeholder text
     */
    searchPlaceholder?: string;
    /**
     * Search change handler
     */
    onSearchChange?: (value: string) => void;
    /**
     * Optional additional filters snippet (dropdowns, checkboxes, etc.)
     */
    filters?: Snippet;
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
    search = $bindable(''),
    searchPlaceholder = 'Search...',
    onSearchChange,
    filters,
    class: className = '',
    ...props
  }: Props = $props();

  function handleSearchInput(event: Event) {
    const target = event.target as HTMLInputElement;
    search = target.value;
    onSearchChange?.(target.value);
  }
</script>

<!--
  @component FilterBar

  Filter bar component with search input and optional additional filters.
  Provides consistent filtering UI across the application.

  See FilterBar.stories.svelte for usage examples.
-->

<div class="flex flex-col gap-4 sm:flex-row sm:items-center {className}" {...props}>
  <div class="relative flex-1">
    <div
      class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 dark:text-gray-500"
    >
      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    </div>
    <input
      type="text"
      value={search}
      oninput={handleSearchInput}
      placeholder={searchPlaceholder}
      class="w-full rounded-md border border-gray-300 bg-white py-2 pr-3 pl-10 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
    />
  </div>
  {#if filters}
    <div class="flex flex-wrap items-center gap-2">
      {@render filters()}
    </div>
  {/if}
</div>
