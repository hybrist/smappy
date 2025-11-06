<script lang="ts">
  import { page } from '$app/stores';

  let { children } = $props();

  const currentPath = $derived($page.url.pathname);
</script>

<div class="dashboard-layout">
  <nav class="dashboard-nav" role="navigation" aria-label="Dashboard navigation">
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
    </ul>
  </nav>
  <main class="dashboard-main" role="main">
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
    @apply min-h-screen bg-gray-50 dark:bg-gray-900;
  }

  .dashboard-nav {
    @apply sticky top-0 z-10 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800;
  }

  .nav-header {
    @apply border-b border-gray-200 px-4 py-4 dark:border-gray-700;
  }

  .nav-title {
    @apply text-xl font-bold text-gray-900 dark:text-white;
  }

  .nav-link {
    @apply text-gray-700 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-white;
  }

  .nav-link.active {
    @apply font-semibold text-blue-600 dark:text-blue-400;
  }

  .nav-links {
    @apply flex gap-6 overflow-x-auto px-4 py-2;
  }

  .nav-links li {
    @apply list-none;
  }

  .dashboard-main {
    @apply flex-1;
  }

  .dashboard-empty {
    @apply flex min-h-[400px] items-center justify-center text-gray-500 dark:text-gray-400;
  }

  @media (max-width: 640px) {
    .nav-links {
      @apply gap-4;
    }
  }
</style>
