<script lang="ts">
  import type { SuggestionWithLinks } from '$lib/server/query/types';
  import SuggestionCard from './SuggestionCard.svelte';

  interface Props {
    suggestions: SuggestionWithLinks[];
    projectName?: string;
  }

  let { suggestions, projectName }: Props = $props();

  // Filter state
  let selectedType = $state<string>('all');
  let selectedSeverity = $state<string>('all');

  // Get unique types from suggestions
  const uniqueTypes = $derived(() => {
    const types = new Set(suggestions.map((s) => s.type));
    return Array.from(types).sort();
  });

  // Filter suggestions based on selected filters
  const filteredSuggestions = $derived(() => {
    return suggestions.filter((suggestion) => {
      const typeMatch = selectedType === 'all' || suggestion.type === selectedType;
      const severityMatch = selectedSeverity === 'all' || suggestion.severity === selectedSeverity;
      return typeMatch && severityMatch;
    });
  });

  // Count by severity
  const severityCounts = $derived(() => {
    return {
      critical: suggestions.filter((s) => s.severity === 'critical').length,
      warning: suggestions.filter((s) => s.severity === 'warning').length,
      info: suggestions.filter((s) => s.severity === 'info').length,
    };
  });
</script>

<div class="suggestion-list">
  <div class="list-header">
    <h2 class="list-title">Suggestions</h2>
    <div class="severity-summary">
      <span class="severity-count severity-critical-count">
        <span class="count-badge">{severityCounts().critical}</span>
        Critical
      </span>
      <span class="severity-count severity-warning-count">
        <span class="count-badge">{severityCounts().warning}</span>
        Warning
      </span>
      <span class="severity-count severity-info-count">
        <span class="count-badge">{severityCounts().info}</span>
        Info
      </span>
    </div>
  </div>

  <div class="filters">
    <div class="filter-group">
      <label for="type-filter" class="filter-label">Type:</label>
      <select id="type-filter" bind:value={selectedType} class="filter-select">
        <option value="all">All Types</option>
        {#each uniqueTypes() as type (type)}
          <option value={type}>{type}</option>
        {/each}
      </select>
    </div>

    <div class="filter-group">
      <label for="severity-filter" class="filter-label">Severity:</label>
      <select id="severity-filter" bind:value={selectedSeverity} class="filter-select">
        <option value="all">All Severities</option>
        <option value="critical">Critical</option>
        <option value="warning">Warning</option>
        <option value="info">Info</option>
      </select>
    </div>

    <div class="filter-summary">
      Showing {filteredSuggestions().length} of {suggestions.length} suggestions
    </div>
  </div>

  {#if filteredSuggestions().length === 0}
    <div class="empty-state">
      {#if suggestions.length === 0}
        <p>No suggestions available for this analysis.</p>
      {:else}
        <p>No suggestions match the selected filters.</p>
      {/if}
    </div>
  {:else}
    <div class="suggestions-grid">
      {#each filteredSuggestions() as suggestion (suggestion.id)}
        <SuggestionCard {suggestion} {projectName} />
      {/each}
    </div>
  {/if}
</div>

<style>
  .suggestion-list {
    padding: 1.5rem;
  }

  .list-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.5rem;
    gap: 1rem;
  }

  .list-title {
    font-size: 1.5rem;
    font-weight: bold;
    color: #111827;
  }

  @media (prefers-color-scheme: dark) {
    .list-title {
      color: #f9fafb;
    }
  }

  .severity-summary {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .severity-count {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: #6b7280;
  }

  @media (prefers-color-scheme: dark) {
    .severity-count {
      color: #9ca3af;
    }
  }

  .count-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.5rem;
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .severity-critical-count .count-badge {
    background-color: #fee2e2;
    color: #991b1b;
  }

  @media (prefers-color-scheme: dark) {
    .severity-critical-count .count-badge {
      background-color: #7f1d1d;
      color: #fecaca;
    }
  }

  .severity-warning-count .count-badge {
    background-color: #fef3c7;
    color: #92400e;
  }

  @media (prefers-color-scheme: dark) {
    .severity-warning-count .count-badge {
      background-color: #78350f;
      color: #fde68a;
    }
  }

  .severity-info-count .count-badge {
    background-color: #dbeafe;
    color: #1e40af;
  }

  @media (prefers-color-scheme: dark) {
    .severity-info-count .count-badge {
      background-color: #1e3a8a;
      color: #bfdbfe;
    }
  }

  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: center;
    padding: 1rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    background-color: #f9fafb;
    margin-bottom: 1.5rem;
  }

  @media (prefers-color-scheme: dark) {
    .filters {
      border-color: #374151;
      background-color: #111827;
    }
  }

  .filter-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .filter-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
  }

  @media (prefers-color-scheme: dark) {
    .filter-label {
      color: #d1d5db;
    }
  }

  .filter-select {
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    background-color: #ffffff;
    color: #111827;
    font-size: 0.875rem;
    cursor: pointer;
    transition: border-color 0.2s;
  }

  .filter-select:hover {
    border-color: #9ca3af;
  }

  .filter-select:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgb(37 99 235 / 0.1);
  }

  @media (prefers-color-scheme: dark) {
    .filter-select {
      border-color: #4b5563;
      background-color: #1f2937;
      color: #f9fafb;
    }

    .filter-select:hover {
      border-color: #6b7280;
    }

    .filter-select:focus {
      border-color: #60a5fa;
      box-shadow: 0 0 0 3px rgb(96 165 250 / 0.1);
    }
  }

  .filter-summary {
    margin-left: auto;
    font-size: 0.875rem;
    color: #6b7280;
  }

  @media (prefers-color-scheme: dark) {
    .filter-summary {
      color: #9ca3af;
    }
  }

  .suggestions-grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: 1fr;
  }

  @media (min-width: 768px) {
    .suggestions-grid {
      grid-template-columns: repeat(auto-fill, minmax(500px, 1fr));
    }
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
    padding: 2rem;
    border: 1px dashed #d1d5db;
    border-radius: 0.5rem;
    color: #6b7280;
    text-align: center;
  }

  @media (prefers-color-scheme: dark) {
    .empty-state {
      border-color: #4b5563;
      color: #9ca3af;
    }
  }

  @media (max-width: 640px) {
    .list-header {
      flex-direction: column;
      align-items: flex-start;
    }

    .severity-summary {
      flex-wrap: wrap;
    }

    .filters {
      flex-direction: column;
      align-items: stretch;
    }

    .filter-group {
      flex-direction: column;
      align-items: stretch;
    }

    .filter-summary {
      margin-left: 0;
    }
  }
</style>
