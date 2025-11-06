<script lang="ts">
  import type { SuggestionWithLinks } from '$lib/server/query/types';

  interface Props {
    suggestion: SuggestionWithLinks;
    projectName?: string;
  }

  let { suggestion, projectName }: Props = $props();

  // Derive severity class for badge styling
  const severityClass = $derived(() => {
    switch (suggestion.severity) {
      case 'critical':
        return 'severity-critical';
      case 'warning':
        return 'severity-warning';
      case 'info':
        return 'severity-info';
      default:
        return 'severity-info';
    }
  });

  const severityLabel = $derived(() => {
    switch (suggestion.severity) {
      case 'critical':
        return 'Critical';
      case 'warning':
        return 'Warning';
      case 'info':
        return 'Info';
      default:
        return 'Info';
    }
  });
</script>

<div class="suggestion-card">
  <div class="suggestion-header">
    <span class="severity-badge {severityClass()}">{severityLabel()}</span>
    <span class="suggestion-type">{suggestion.type}</span>
  </div>
  <h3 class="suggestion-title">{suggestion.title}</h3>
  <p class="suggestion-description">{suggestion.description}</p>
  {#if suggestion.links && suggestion.links.length > 0}
    <div class="suggestion-links">
      <h4 class="links-title">Related entities:</h4>
      <ul class="links-list">
        {#each suggestion.links as link (link.entityId)}
          <li class="link-item">
            {#if link.entityType === 'Module' && link.entityPath && projectName}
              <a
                href="/dashboard/{projectName}/modules?path={encodeURIComponent(link.entityPath)}"
                class="entity-link"
                data-sveltekit-reload
              >
                <span class="entity-type">{link.entityType}:</span>
                {link.entityPath}
              </a>
            {:else}
              <span class="entity-static">
                <span class="entity-type">{link.entityType}:</span>
                ID {link.entityId}
                {#if link.entityPath}
                  ({link.entityPath})
                {/if}
              </span>
            {/if}
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</div>

<style>
  .suggestion-card {
    padding: 1.5rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    background-color: #ffffff;
    transition: box-shadow 0.2s;
  }

  .suggestion-card:hover {
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  }

  @media (prefers-color-scheme: dark) {
    .suggestion-card {
      border-color: #374151;
      background-color: #1f2937;
    }
  }

  .suggestion-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .severity-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.025em;
  }

  .severity-critical {
    background-color: #fee2e2;
    color: #991b1b;
  }

  @media (prefers-color-scheme: dark) {
    .severity-critical {
      background-color: #7f1d1d;
      color: #fecaca;
    }
  }

  .severity-warning {
    background-color: #fef3c7;
    color: #92400e;
  }

  @media (prefers-color-scheme: dark) {
    .severity-warning {
      background-color: #78350f;
      color: #fde68a;
    }
  }

  .severity-info {
    background-color: #dbeafe;
    color: #1e40af;
  }

  @media (prefers-color-scheme: dark) {
    .severity-info {
      background-color: #1e3a8a;
      color: #bfdbfe;
    }
  }

  .suggestion-type {
    font-size: 0.875rem;
    color: #6b7280;
  }

  @media (prefers-color-scheme: dark) {
    .suggestion-type {
      color: #9ca3af;
    }
  }

  .suggestion-title {
    margin-bottom: 0.5rem;
    font-size: 1.125rem;
    font-weight: 600;
    color: #111827;
  }

  @media (prefers-color-scheme: dark) {
    .suggestion-title {
      color: #f9fafb;
    }
  }

  .suggestion-description {
    margin-bottom: 1rem;
    color: #4b5563;
    line-height: 1.625;
  }

  @media (prefers-color-scheme: dark) {
    .suggestion-description {
      color: #d1d5db;
    }
  }

  .suggestion-links {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #e5e7eb;
  }

  @media (prefers-color-scheme: dark) {
    .suggestion-links {
      border-color: #374151;
    }
  }

  .links-title {
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
  }

  @media (prefers-color-scheme: dark) {
    .links-title {
      color: #d1d5db;
    }
  }

  .links-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .link-item {
    margin-bottom: 0.25rem;
  }

  .entity-link {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.875rem;
    color: #2563eb;
    text-decoration: none;
    transition: color 0.2s;
  }

  .entity-link:hover {
    color: #1d4ed8;
    text-decoration: underline;
  }

  @media (prefers-color-scheme: dark) {
    .entity-link {
      color: #60a5fa;
    }

    .entity-link:hover {
      color: #93c5fd;
    }
  }

  .entity-static {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.875rem;
    color: #6b7280;
  }

  @media (prefers-color-scheme: dark) {
    .entity-static {
      color: #9ca3af;
    }
  }

  .entity-type {
    font-weight: 600;
  }
</style>
