<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { setKeyboardShortcutsContext } from '$lib/utils/keyboard-shortcuts-store.svelte';
  import KeyboardShortcutsModal from '$lib/components/ui/KeyboardShortcutsModal.svelte';

  let { children } = $props();

  const currentPath = $derived($page.url.pathname);
  const projectName = $derived($page.params.projectName);

  const manager = setKeyboardShortcutsContext();

  onMount(() => {
    // Register navigation shortcuts
    manager.register({
      key: '1',
      description: 'Go to Overview',
      category: 'Navigation',
      handler: () => {
        if (projectName) goto(`/dashboard/${projectName}`);
      },
    });

    manager.register({
      key: '2',
      description: 'Go to Dependencies',
      category: 'Navigation',
      handler: () => {
        if (projectName) goto(`/dashboard/${projectName}/dependencies`);
      },
    });

    manager.register({
      key: '3',
      description: 'Go to Compare',
      category: 'Navigation',
      handler: () => {
        if (projectName) goto(`/dashboard/${projectName}/compare`);
      },
    });

    manager.register({
      key: '4',
      description: 'Go to Suggestions',
      category: 'Navigation',
      handler: () => {
        if (projectName) goto(`/dashboard/${projectName}/suggestions`);
      },
    });

    manager.register({
      key: 'g+d',
      description: 'Go to Dashboard',
      category: 'Navigation',
      displayKey: 'G D',
      handler: () => {
        goto('/dashboard');
      },
    });

    manager.register({
      key: 'g+h',
      description: 'Go to Home',
      category: 'Navigation',
      displayKey: 'G H',
      handler: () => {
        goto('/');
      },
    });

    manager.register({
      key: '?',
      description: 'Show keyboard shortcuts',
      category: 'Help',
      displayKey: '?',
      handler: () => {
        manager.toggleHelpModal();
      },
    });

    manager.register({
      key: 'esc',
      description: 'Close modal / Clear focus',
      category: 'General',
      displayKey: 'Esc',
      handler: () => {
        if (manager.isHelpModalOpen) {
          manager.closeHelpModal();
        }
      },
    });

    // Global keyboard event listener
    const handleKeyDown = (event: KeyboardEvent) => {
      manager.handleKeyDown(event);
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  });
</script>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
  <nav
    class="sticky top-0 z-10 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
    aria-label="Dashboard navigation"
  >
    <div class="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
      <div class="flex items-center justify-between">
        <a
          href="/dashboard"
          class="inline-block transition-opacity hover:opacity-80"
          aria-label="Smappy - Bundle Analyzer"
        >
          <img src="/logo.svg" alt="Smappy" class="block h-12 w-auto" />
        </a>
        <button
          class="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          onclick={() => manager.toggleHelpModal()}
          type="button"
          title="Show keyboard shortcuts"
        >
          <span>Shortcuts</span>
          <kbd
            class="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-400"
            >?</kbd
          >
        </button>
      </div>
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
          title="Overview (Press 1)"
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
          title="Dependencies (Press 2)"
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
          title="Compare (Press 3)"
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
          title="Suggestions (Press 4)"
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
  <KeyboardShortcutsModal />
</div>
