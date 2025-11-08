<script lang="ts">
  import { getKeyboardShortcutsContext } from '$lib/utils/keyboard-shortcuts-store.svelte';
  import { formatKeyForDisplay } from '$lib/utils/keyboard-shortcuts';

  const manager = getKeyboardShortcutsContext();

  const categories = $derived(manager.getByCategory());

  function handleClose() {
    manager.closeHelpModal();
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      handleClose();
    }
  }
</script>

{#if manager.isHelpModalOpen}
  <div
    class="modal-backdrop"
    onclick={handleBackdropClick}
    onkeydown={handleKeyDown}
    role="dialog"
    aria-modal="true"
    aria-labelledby="shortcuts-modal-title"
  >
    <div class="modal-content">
      <div class="modal-header">
        <h2 id="shortcuts-modal-title" class="modal-title">Keyboard Shortcuts</h2>
        <button
          class="close-button"
          onclick={handleClose}
          aria-label="Close shortcuts help"
          type="button"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="modal-body">
        {#each categories as category (category.name)}
          <div class="category">
            <h3 class="category-title">{category.name}</h3>
            <div class="shortcuts-list">
              {#each category.shortcuts as shortcut (shortcut.key)}
                <div class="shortcut-item">
                  <span class="shortcut-description">{shortcut.description}</span>
                  <kbd class="shortcut-key">
                    {shortcut.displayKey || formatKeyForDisplay(shortcut.key)}
                  </kbd>
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>

      <div class="modal-footer">
        <p class="footer-text">
          Press <kbd class="inline-kbd">?</kbd> or <kbd class="inline-kbd">Esc</kbd> to close
        </p>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 1rem;
    backdrop-filter: blur(4px);
  }

  .modal-content {
    background-color: white;
    border-radius: 0.75rem;
    box-shadow:
      0 20px 25px -5px rgba(0, 0, 0, 0.1),
      0 10px 10px -5px rgba(0, 0, 0, 0.04);
    max-width: 42rem;
    width: 100%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
  }

  :global(.dark) .modal-content {
    background-color: rgb(31, 41, 55);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.5rem;
    border-bottom: 1px solid rgb(229, 231, 235);
  }

  :global(.dark) .modal-header {
    border-bottom-color: rgb(55, 65, 81);
  }

  .modal-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: rgb(17, 24, 39);
    margin: 0;
  }

  :global(.dark) .modal-title {
    color: white;
  }

  .close-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border: none;
    background-color: transparent;
    color: rgb(107, 114, 128);
    border-radius: 0.375rem;
    cursor: pointer;
    transition:
      background-color 0.2s,
      color 0.2s;
  }

  .close-button:hover {
    background-color: rgb(243, 244, 246);
    color: rgb(17, 24, 39);
  }

  :global(.dark) .close-button:hover {
    background-color: rgb(55, 65, 81);
    color: white;
  }

  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
  }

  .category {
    margin-bottom: 2rem;
  }

  .category:last-child {
    margin-bottom: 0;
  }

  .category-title {
    font-size: 0.875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: rgb(107, 114, 128);
    margin: 0 0 0.75rem 0;
  }

  :global(.dark) .category-title {
    color: rgb(156, 163, 175);
  }

  .shortcuts-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .shortcut-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem;
    border-radius: 0.5rem;
    background-color: rgb(249, 250, 251);
  }

  :global(.dark) .shortcut-item {
    background-color: rgb(55, 65, 81);
  }

  .shortcut-description {
    color: rgb(55, 65, 81);
    font-size: 0.875rem;
  }

  :global(.dark) .shortcut-description {
    color: rgb(229, 231, 235);
  }

  .shortcut-key {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    font-family:
      ui-monospace, 'SFMono-Regular', 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
    font-size: 0.75rem;
    font-weight: 600;
    color: rgb(55, 65, 81);
    background-color: white;
    border: 1px solid rgb(209, 213, 219);
    border-radius: 0.375rem;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  }

  :global(.dark) .shortcut-key {
    color: rgb(229, 231, 235);
    background-color: rgb(31, 41, 55);
    border-color: rgb(75, 85, 99);
  }

  .modal-footer {
    padding: 1rem 1.5rem;
    border-top: 1px solid rgb(229, 231, 235);
    background-color: rgb(249, 250, 251);
    border-bottom-left-radius: 0.75rem;
    border-bottom-right-radius: 0.75rem;
  }

  :global(.dark) .modal-footer {
    border-top-color: rgb(55, 65, 81);
    background-color: rgb(55, 65, 81);
  }

  .footer-text {
    margin: 0;
    font-size: 0.875rem;
    color: rgb(107, 114, 128);
    text-align: center;
  }

  :global(.dark) .footer-text {
    color: rgb(156, 163, 175);
  }

  .inline-kbd {
    display: inline-flex;
    padding: 0.125rem 0.375rem;
    font-family:
      ui-monospace, 'SFMono-Regular', 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
    font-size: 0.75rem;
    font-weight: 600;
    color: rgb(55, 65, 81);
    background-color: white;
    border: 1px solid rgb(209, 213, 219);
    border-radius: 0.25rem;
  }

  :global(.dark) .inline-kbd {
    color: rgb(229, 231, 235);
    background-color: rgb(31, 41, 55);
    border-color: rgb(75, 85, 99);
  }
</style>
