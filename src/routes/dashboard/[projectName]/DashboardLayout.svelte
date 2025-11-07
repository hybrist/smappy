<script lang="ts">
  import { page } from '$app/stores';

  let { children } = $props();

  const currentPath = $derived($page.url.pathname);
</script>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
  <nav
    class="sticky top-0 z-10 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
    aria-label="Dashboard navigation"
  >
    <div class="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
      <a
        href="/dashboard"
        class="inline-block transition-opacity hover:opacity-80"
        aria-label="Smappy - Bundle Analyzer"
      >
        <img src="/logo.svg" alt="Smappy" class="block h-12 w-auto" />
      </a>
    </div>
    <ul class="flex gap-6 overflow-x-auto px-4 py-2 sm:gap-6" role="list">
      <li>
        <a
          href="/dashboard/{$page.params.projectName}"
          class="text-gray-700 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
          class:font-semibold={currentPath === `/dashboard/${$page.params.projectName}`}
          class:text-primary-600={currentPath === `/dashboard/${$page.params.projectName}`}
          class:dark:text-primary-400={currentPath === `/dashboard/${$page.params.projectName}`}
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
          class="text-gray-700 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
          class:font-semibold={currentPath.startsWith(
            `/dashboard/${$page.params.projectName}/modules`,
          )}
          class:text-primary-600={currentPath.startsWith(
            `/dashboard/${$page.params.projectName}/modules`,
          )}
          class:dark:text-primary-400={currentPath.startsWith(
            `/dashboard/${$page.params.projectName}/modules`,
          )}
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
          class="text-gray-700 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
          class:font-semibold={currentPath.startsWith(
            `/dashboard/${$page.params.projectName}/dependencies`,
          )}
          class:text-primary-600={currentPath.startsWith(
            `/dashboard/${$page.params.projectName}/dependencies`,
          )}
          class:dark:text-primary-400={currentPath.startsWith(
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
          class="text-gray-700 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
          class:font-semibold={currentPath.startsWith(
            `/dashboard/${$page.params.projectName}/compare`,
          )}
          class:text-primary-600={currentPath.startsWith(
            `/dashboard/${$page.params.projectName}/compare`,
          )}
          class:dark:text-primary-400={currentPath.startsWith(
            `/dashboard/${$page.params.projectName}/compare`,
          )}
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
          class="text-gray-700 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
          class:font-semibold={currentPath.startsWith(
            `/dashboard/${$page.params.projectName}/suggestions`,
          )}
          class:text-primary-600={currentPath.startsWith(
            `/dashboard/${$page.params.projectName}/suggestions`,
          )}
          class:dark:text-primary-400={currentPath.startsWith(
            `/dashboard/${$page.params.projectName}/suggestions`,
          )}
          aria-current={currentPath.startsWith(`/dashboard/${$page.params.projectName}/suggestions`)
            ? 'page'
            : undefined}
        >
          Suggestions
        </a>
      </li>
    </ul>
  </nav>
  <main class="flex-1">
    {#if $page.params.projectName}
      {@render children()}
    {:else}
      <div class="flex min-h-96 items-center justify-center text-gray-600 dark:text-gray-400">
        <p>Please select a project to view analysis data.</p>
      </div>
    {/if}
  </main>
</div>
