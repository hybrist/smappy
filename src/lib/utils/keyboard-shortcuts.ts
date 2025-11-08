/**
 * Keyboard shortcuts utility
 * Manages keyboard event handling and shortcut registration
 */

export type ShortcutKey = string;
export type ShortcutHandler = (event: KeyboardEvent) => void;

export interface Shortcut {
  key: ShortcutKey;
  description: string;
  handler: ShortcutHandler;
  category?: string;
  displayKey?: string;
}

export interface ShortcutCategory {
  name: string;
  shortcuts: Shortcut[];
}

/**
 * Check if an element is an input field where we should ignore shortcuts
 */
export function isInputElement(element: Element | null): boolean {
  if (!element) return false;

  const tagName = element.tagName.toLowerCase();
  const isContentEditable = element.getAttribute('contenteditable') === 'true';

  return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || isContentEditable;
}

/**
 * Normalize keyboard event to a key string
 */
export function getKeyString(event: KeyboardEvent): string {
  const parts: string[] = [];

  if (event.metaKey || event.ctrlKey) parts.push('mod');
  if (event.altKey) parts.push('alt');
  if (event.shiftKey) parts.push('shift');

  // Use event.key for the main key, but normalize some special cases
  let key = event.key.toLowerCase();

  // Normalize special keys
  if (key === 'escape') key = 'esc';
  if (key === ' ') key = 'space';

  parts.push(key);

  return parts.join('+');
}

/**
 * Check if two key strings match
 */
export function matchesKey(keyString: string, shortcutKey: string): boolean {
  return keyString === shortcutKey.toLowerCase();
}

/**
 * Format key for display (e.g., "mod+k" -> "⌘K" or "Ctrl+K")
 */
export function formatKeyForDisplay(key: string): string {
  const isMac =
    typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac');

  return key
    .split('+')
    .map((part) => {
      switch (part.toLowerCase()) {
        case 'mod':
          return isMac ? '⌘' : 'Ctrl';
        case 'alt':
          return isMac ? '⌥' : 'Alt';
        case 'shift':
          return isMac ? '⇧' : 'Shift';
        case 'esc':
          return 'Esc';
        case 'space':
          return 'Space';
        default:
          return part.toUpperCase();
      }
    })
    .join(isMac ? '' : '+');
}
