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
  const uniqueTypes = $derived(Array.from(new Set(suggestions.map((s) => s.type))).sort());

  // Filter suggestions based on selected filters
  const filteredSuggestions = $derived(
    suggestions.filter((suggestion) => {
      const typeMatch = selectedType === 'all' || suggestion.type === selectedType;
      const severityMatch = selectedSeverity === 'all' || suggestion.severity === selectedSeverity;
      return typeMatch && severityMatch;
    }),
  );

  // Count by severity
  const severityCounts = $derived({
    critical: suggestions.filter((s) => s.severity === 'critical').length,
    warning: suggestions.filter((s) => s.severity === 'warning').length,
    info: suggestions.filter((s) => s.severity === 'info').length,
  });
</script>

<div class="suggestion-list">
  <div class="list-header">
    <h2 class="list-title">Suggestions</h2>
    <div class="severity-summary">
      <span class="severity-count severity-critical-count">
        <span class="count-badge">{severityCounts.critical}</span>
        Critical
      </span>
      <span class="severity-count severity-warning-count">
        <span class="count-badge">{severityCounts.warning}</span>
        Warning
      </span>
      <span class="severity-count severity-info-count">
        <span class="count-badge">{severityCounts.info}</span>
        Info
      </span>
    </div>
  </div>

  <div class="filters">
    <div class="filter-group">
      <label for="type-filter" class="filter-label">Type:</label>
      <select id="type-filter" bind:value={selectedType} class="filter-select">
        <option value="all">All Types</option>
        {#each uniqueTypes as type (type)}
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
      Showing {filteredSuggestions.length} of {suggestions.length} suggestions
    </div>
  </div>

  {#if filteredSuggestions.length === 0}
    <div class="empty-state">
      {#if suggestions.length === 0}
        <div class="empty-state-content">
          <div class="empty-state-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="icon-large"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
              />
            </svg>
          </div>
          <h3 class="empty-state-title">AI-Powered Suggestions</h3>
          <div class="empty-state-description">
            <p>
              Suggestions are generated automatically using AI during bundle analysis to help
              optimize your code.
            </p>
            <div class="info-section">
              <h4>Why don't I see suggestions?</h4>
              <ul>
                <li>
                  <strong>LLM Integration Required:</strong> Suggestions use OpenAI or Anthropic to analyze
                  your bundle
                </li>
                <li>
                  <strong>Configuration Needed:</strong> Set <code>SMAPPY_LLM_ENABLED=true</code> and
                  provide an API key
                </li>
                <li>
                  <strong>API Keys:</strong> Set either <code>SMAPPY_OPENAI_API_KEY</code> or
                  <code>SMAPPY_ANTHROPIC_API_KEY</code>
                </li>
              </ul>
            </div>
            <div class="info-section">
              <h4>How to enable:</h4>
              <ol>
                <li>Configure environment variables in your <code>.env</code> file</li>
                <li>Run a new analysis of your bundle</li>
                <li>Suggestions will appear automatically (typically within a few seconds)</li>
              </ol>
            </div>
            <div class="info-box">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="info-icon"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                />
              </svg>
              <p>
                Once configured, AI suggestions analyze your bundle structure, identify optimization
                opportunities, and provide specific recommendations to reduce bundle size and
                improve performance.
              </p>
            </div>
          </div>
        </div>
      {:else}
        <p>No suggestions match the selected filters.</p>
      {/if}
    </div>
  {:else}
    <div class="suggestions-grid">
      {#each filteredSuggestions as suggestion (suggestion.id)}
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
  }

  @media (prefers-color-scheme: dark) {
    .empty-state {
      border-color: #4b5563;
      color: #9ca3af;
    }
  }

  .empty-state-content {
    max-width: 48rem;
    text-align: left;
  }

  .empty-state-icon {
    display: flex;
    justify-content: center;
    margin-bottom: 1.5rem;
    color: #9ca3af;
  }

  @media (prefers-color-scheme: dark) {
    .empty-state-icon {
      color: #6b7280;
    }
  }

  .icon-large {
    width: 4rem;
    height: 4rem;
  }

  .empty-state-title {
    font-size: 1.5rem;
    font-weight: bold;
    color: #111827;
    margin-bottom: 1rem;
    text-align: center;
  }

  @media (prefers-color-scheme: dark) {
    .empty-state-title {
      color: #f9fafb;
    }
  }

  .empty-state-description {
    font-size: 0.9375rem;
    line-height: 1.625;
  }

  .empty-state-description > p {
    margin-bottom: 1.5rem;
    color: #4b5563;
    text-align: center;
  }

  @media (prefers-color-scheme: dark) {
    .empty-state-description > p {
      color: #d1d5db;
    }
  }

  .info-section {
    margin-bottom: 1.5rem;
    padding: 1.25rem;
    background-color: #f9fafb;
    border-radius: 0.5rem;
    border: 1px solid #e5e7eb;
  }

  @media (prefers-color-scheme: dark) {
    .info-section {
      background-color: #1f2937;
      border-color: #374151;
    }
  }

  .info-section h4 {
    font-size: 1rem;
    font-weight: 600;
    color: #111827;
    margin-bottom: 0.75rem;
  }

  @media (prefers-color-scheme: dark) {
    .info-section h4 {
      color: #f9fafb;
    }
  }

  .info-section ul,
  .info-section ol {
    margin-left: 1.5rem;
    color: #4b5563;
  }

  @media (prefers-color-scheme: dark) {
    .info-section ul,
    .info-section ol {
      color: #d1d5db;
    }
  }

  .info-section li {
    margin-bottom: 0.5rem;
  }

  .info-section code {
    padding: 0.125rem 0.375rem;
    background-color: #e5e7eb;
    color: #be123c;
    border-radius: 0.25rem;
    font-family: 'Courier New', monospace;
    font-size: 0.875rem;
  }

  @media (prefers-color-scheme: dark) {
    .info-section code {
      background-color: #374151;
      color: #fda4af;
    }
  }

  .info-box {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    background-color: #dbeafe;
    border-left: 4px solid #3b82f6;
    border-radius: 0.375rem;
  }

  @media (prefers-color-scheme: dark) {
    .info-box {
      background-color: #1e3a8a;
      border-left-color: #60a5fa;
    }
  }

  .info-box p {
    margin: 0;
    color: #1e40af;
    font-size: 0.875rem;
    line-height: 1.5;
  }

  @media (prefers-color-scheme: dark) {
    .info-box p {
      color: #bfdbfe;
    }
  }

  .info-icon {
    width: 1.5rem;
    height: 1.5rem;
    flex-shrink: 0;
    color: #3b82f6;
  }

  @media (prefers-color-scheme: dark) {
    .info-icon {
      color: #60a5fa;
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
