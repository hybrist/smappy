<script lang="ts">
  import { page } from '$app/stores';

  let { children } = $props();

  const currentPath = $derived($page.url.pathname);
</script>

<div class="dashboard-layout">
  <nav class="dashboard-nav" aria-label="Dashboard navigation">
    <div class="nav-header">
      <h1 class="nav-title">
        <a href="/dashboard" class="nav-link">Bundle Analysis</a>
      </h1>
    </div>
    <ul class="nav-links" role="list">
      <li>
        <a
          href="/dashboard/{$page.params.projectName}"
          class="nav-link"
          class:active={currentPath === `/dashboard/${$page.params.projectName}`}
          aria-current={currentPath === `/dashboard/${$page.params.projectName}`
            ? 'page'
            : undefined}
        >
          Overview
        </a>
      </li>
      <li>
        <a
          href="/dashboard/{$page.params.projectName}/modules"
          class="nav-link"
          class:active={currentPath.startsWith(`/dashboard/${$page.params.projectName}/modules`)}
          aria-current={currentPath.startsWith(`/dashboard/${$page.params.projectName}/modules`)
            ? 'page'
            : undefined}
        >
          Modules
        </a>
      </li>
      <li>
        <a
          href="/dashboard/{$page.params.projectName}/dependencies"
          class="nav-link"
          class:active={currentPath.startsWith(
            `/dashboard/${$page.params.projectName}/dependencies`,
          )}
          aria-current={currentPath.startsWith(
            `/dashboard/${$page.params.projectName}/dependencies`,
          )
            ? 'page'
            : undefined}
        >
          Dependencies
        </a>
      </li>
      <li>
        <a
          href="/dashboard/{$page.params.projectName}/compare"
          class="nav-link"
          class:active={currentPath.startsWith(`/dashboard/${$page.params.projectName}/compare`)}
          aria-current={currentPath.startsWith(`/dashboard/${$page.params.projectName}/compare`)
            ? 'page'
            : undefined}
        >
          Compare
        </a>
      </li>
      <li>
        <a
          href="/dashboard/{$page.params.projectName}/suggestions"
          class="nav-link"
          class:active={currentPath.startsWith(
            `/dashboard/${$page.params.projectName}/suggestions`,
          )}
          aria-current={currentPath.startsWith(
            `/dashboard/${$page.params.projectName}/suggestions`,
          )
            ? 'page'
            : undefined}
        >
          Suggestions
        </a>
      </li>
    </ul>
  </nav>
  <main class="dashboard-main">
    {#if $page.params.projectName}
      {@render children()}
    {:else}
      <div class="dashboard-empty">
        <p>Please select a project to view analysis data.</p>
      </div>
    {/if}
  </main>
</div>

<style>
  .dashboard-layout {
    min-height: 100vh;
    background-color: #f9fafb;
  }

  @media (prefers-color-scheme: dark) {
    .dashboard-layout {
      background-color: #111827;
    }
  }

  .dashboard-nav {
    position: sticky;
    top: 0;
    z-index: 10;
    border-bottom: 1px solid #e5e7eb;
    background-color: #ffffff;
  }

  @media (prefers-color-scheme: dark) {
    .dashboard-nav {
      border-color: #374151;
      background-color: #1f2937;
    }
  }

  .nav-header {
    border-bottom: 1px solid #e5e7eb;
    padding: 1rem;
  }

  @media (prefers-color-scheme: dark) {
    .nav-header {
      border-color: #374151;
    }
  }

  .nav-title {
    font-size: 1.25rem;
    font-weight: bold;
    color: #111827;
  }

  @media (prefers-color-scheme: dark) {
    .nav-title {
      color: #ffffff;
    }
  }

  .nav-link {
    color: #374151;
    transition: color 0.2s;
  }

  .nav-link:hover {
    color: #111827;
  }

  .nav-link.active {
    font-weight: 600;
    color: #2563eb;
  }

  @media (prefers-color-scheme: dark) {
    .nav-link {
      color: #d1d5db;
    }

    .nav-link:hover {
      color: #ffffff;
    }

    .nav-link.active {
      color: #60a5fa;
    }
  }

  .nav-links {
    display: flex;
    gap: 1.5rem;
    overflow-x: auto;
    padding: 0.5rem 1rem;
  }

  .nav-links li {
    list-style: none;
  }

  .dashboard-main {
    flex: 1;
  }

  .dashboard-empty {
    display: flex;
    min-height: 400px;
    align-items: center;
    justify-content: center;
    color: #6b7280;
  }

  @media (prefers-color-scheme: dark) {
    .dashboard-empty {
      color: #9ca3af;
    }
  }

  @media (max-width: 640px) {
    .nav-links {
      gap: 1rem;
    }
  }
</style>
