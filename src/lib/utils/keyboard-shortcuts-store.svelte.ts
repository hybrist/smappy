/**
 * Keyboard shortcuts store
 * Global state management for keyboard shortcuts
 */

import { getContext, setContext } from 'svelte';
import type { Shortcut, ShortcutCategory } from './keyboard-shortcuts';
import { isInputElement, getKeyString, matchesKey } from './keyboard-shortcuts';

const SHORTCUTS_KEY = Symbol('keyboard-shortcuts');

export interface KeyboardShortcutsState {
  shortcuts: Shortcut[];
  isHelpModalOpen: boolean;
  sequenceBuffer: string[];
  sequenceTimeout: number | null;
}

export class KeyboardShortcutsManager {
  private state = $state<KeyboardShortcutsState>({
    shortcuts: [],
    isHelpModalOpen: false,
    sequenceBuffer: [],
    sequenceTimeout: null,
  });

  get shortcuts() {
    return this.state.shortcuts;
  }

  get isHelpModalOpen() {
    return this.state.isHelpModalOpen;
  }

  openHelpModal() {
    this.state.isHelpModalOpen = true;
  }

  closeHelpModal() {
    this.state.isHelpModalOpen = false;
  }

  toggleHelpModal() {
    this.state.isHelpModalOpen = !this.state.isHelpModalOpen;
  }

  register(shortcut: Shortcut) {
    // Remove existing shortcut with same key
    this.state.shortcuts = this.state.shortcuts.filter((s) => s.key !== shortcut.key);
    this.state.shortcuts.push(shortcut);
  }

  unregister(key: string) {
    this.state.shortcuts = this.state.shortcuts.filter((s) => s.key !== key);
  }

  getByCategory(): ShortcutCategory[] {
    const categoriesRecord: Record<string, Shortcut[]> = {};

    for (const shortcut of this.state.shortcuts) {
      const category = shortcut.category || 'General';
      if (!categoriesRecord[category]) {
        categoriesRecord[category] = [];
      }
      categoriesRecord[category].push(shortcut);
    }

    return Object.entries(categoriesRecord).map(([name, shortcuts]) => ({
      name,
      shortcuts,
    }));
  }

  handleKeyDown(event: KeyboardEvent) {
    // Don't handle shortcuts when typing in input fields
    if (isInputElement(event.target as Element)) {
      // Exception: allow Escape to blur input fields
      if (event.key === 'Escape') {
        (event.target as HTMLElement).blur();
        this.clearSequence();
      }
      return;
    }

    // Get the key string for this event
    const keyString = getKeyString(event);

    // Check for sequence shortcuts (like "g+d")
    if (this.state.sequenceBuffer.length > 0) {
      this.state.sequenceBuffer.push(event.key.toLowerCase());
      const sequenceKey = this.state.sequenceBuffer.join('+');

      // Check if any shortcut matches this sequence
      const shortcut = this.state.shortcuts.find((s) => matchesKey(sequenceKey, s.key));

      if (shortcut) {
        event.preventDefault();
        shortcut.handler(event);
        this.clearSequence();
        return;
      }

      // Check if this could be the start of a longer sequence
      const hasPartialMatch = this.state.shortcuts.some((s) =>
        s.key.toLowerCase().startsWith(sequenceKey.toLowerCase() + '+'),
      );

      if (!hasPartialMatch) {
        this.clearSequence();
      } else {
        // Reset timeout for sequence
        this.resetSequenceTimeout();
      }
      return;
    }

    // Check for single key shortcuts
    const shortcut = this.state.shortcuts.find((s) => matchesKey(keyString, s.key));

    if (shortcut) {
      event.preventDefault();
      shortcut.handler(event);
      return;
    }

    // Check if this could be the start of a sequence (like "g")
    const couldStartSequence = this.state.shortcuts.some(
      (s) => s.key.includes('+') && s.key.toLowerCase().startsWith(event.key.toLowerCase() + '+'),
    );

    if (couldStartSequence && !event.ctrlKey && !event.metaKey && !event.altKey) {
      this.state.sequenceBuffer = [event.key.toLowerCase()];
      this.resetSequenceTimeout();
    }
  }

  private clearSequence() {
    this.state.sequenceBuffer = [];
    if (this.state.sequenceTimeout !== null) {
      clearTimeout(this.state.sequenceTimeout);
      this.state.sequenceTimeout = null;
    }
  }

  private resetSequenceTimeout() {
    if (this.state.sequenceTimeout !== null) {
      clearTimeout(this.state.sequenceTimeout);
    }

    this.state.sequenceTimeout = setTimeout(() => {
      this.clearSequence();
    }, 1000); // 1 second timeout for sequences
  }
}

export function setKeyboardShortcutsContext() {
  const manager = new KeyboardShortcutsManager();
  setContext(SHORTCUTS_KEY, manager);
  return manager;
}

export function getKeyboardShortcutsContext(): KeyboardShortcutsManager {
  return getContext(SHORTCUTS_KEY);
}
