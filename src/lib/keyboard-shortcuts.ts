/**
 * Keyboard Shortcuts System
 * 
 * Provides a centralized system for managing keyboard shortcuts across the application.
 * Supports common actions like search, navigation, and quick access to features.
 */

export interface KeyboardShortcut {
  /**
   * Unique identifier for the shortcut
   */
  id: string;
  
  /**
   * Description of what the shortcut does
   */
  description: string;
  
  /**
   * Key combination (e.g., 'ctrl+k', 'alt+d')
   */
  keys: string;
  
  /**
   * Callback function to execute
   */
  action: () => void;
  
  /**
   * Category for grouping shortcuts
   */
  category?: 'navigation' | 'search' | 'actions' | 'general';
}

/**
 * Parse key combination string into modifier keys and main key
 */
function parseKeys(keys: string): {
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
  key: string;
} {
  const parts = keys.toLowerCase().split('+');
  const modifiers = {
    ctrl: parts.includes('ctrl'),
    alt: parts.includes('alt'),
    shift: parts.includes('shift'),
    meta: parts.includes('meta') || parts.includes('cmd'),
    key: parts[parts.length - 1],
  };
  return modifiers;
}

/**
 * Check if a keyboard event matches a shortcut
 */
function matchesShortcut(
  event: KeyboardEvent,
  shortcut: { ctrl: boolean; alt: boolean; shift: boolean; meta: boolean; key: string }
): boolean {
  return (
    event.ctrlKey === shortcut.ctrl &&
    event.altKey === shortcut.alt &&
    event.shiftKey === shortcut.shift &&
    event.metaKey === shortcut.meta &&
    event.key.toLowerCase() === shortcut.key
  );
}

/**
 * Keyboard Shortcuts Manager
 */
export class KeyboardShortcutsManager {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private enabled = true;

  /**
   * Register a keyboard shortcut
   */
  register(shortcut: KeyboardShortcut): void {
    this.shortcuts.set(shortcut.id, shortcut);
  }

  /**
   * Unregister a keyboard shortcut
   */
  unregister(id: string): void {
    this.shortcuts.delete(id);
  }

  /**
   * Get all registered shortcuts
   */
  getAll(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * Get shortcuts by category
   */
  getByCategory(category: string): KeyboardShortcut[] {
    return this.getAll().filter((s) => s.category === category);
  }

  /**
   * Enable keyboard shortcuts
   */
  enable(): void {
    this.enabled = true;
  }

  /**
   * Disable keyboard shortcuts
   */
  disable(): void {
    this.enabled = false;
  }

  /**
   * Handle keyboard event
   */
  handleKeyDown(event: KeyboardEvent): void {
    if (!this.enabled) return;

    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // Allow Escape key to blur inputs
      if (event.key === 'Escape') {
        target.blur();
      }
      return;
    }

    // Check each registered shortcut
    for (const shortcut of this.shortcuts.values()) {
      const parsed = parseKeys(shortcut.keys);
      if (matchesShortcut(event, parsed)) {
        event.preventDefault();
        shortcut.action();
        break;
      }
    }
  }

  /**
   * Initialize the keyboard shortcuts system
   */
  init(): () => void {
    const handler = (event: KeyboardEvent) => this.handleKeyDown(event);
    window.addEventListener('keydown', handler);

    // Return cleanup function
    return () => {
      window.removeEventListener('keydown', handler);
    };
  }
}

/**
 * Global keyboard shortcuts manager instance
 */
export const keyboardShortcuts = new KeyboardShortcutsManager();

/**
 * Format key combination for display
 */
export function formatKeyCombo(keys: string): string {
  const parts = keys.split('+');
  const formatted = parts.map((part) => {
    switch (part.toLowerCase()) {
      case 'ctrl':
        return '⌃';
      case 'alt':
        return '⌥';
      case 'shift':
        return '⇧';
      case 'meta':
      case 'cmd':
        return '⌘';
      default:
        return part.toUpperCase();
    }
  });
  return formatted.join(' + ');
}

/**
 * Default keyboard shortcuts
 */
export const defaultShortcuts: Omit<KeyboardShortcut, 'action'>[] = [
  {
    id: 'search',
    description: 'Open search',
    keys: 'ctrl+k',
    category: 'search',
  },
  {
    id: 'dashboard',
    description: 'Go to dashboard',
    keys: 'alt+d',
    category: 'navigation',
  },
  {
    id: 'parking-lots',
    description: 'Go to parking lots',
    keys: 'alt+p',
    category: 'navigation',
  },
  {
    id: 'contractors',
    description: 'Go to contractors',
    keys: 'alt+c',
    category: 'navigation',
  },
  {
    id: 'violations',
    description: 'Go to violations',
    keys: 'alt+v',
    category: 'navigation',
  },
  {
    id: 'analytics',
    description: 'Go to analytics',
    keys: 'alt+a',
    category: 'navigation',
  },
  {
    id: 'settings',
    description: 'Go to settings',
    keys: 'alt+s',
    category: 'navigation',
  },
  {
    id: 'help',
    description: 'Show keyboard shortcuts',
    keys: 'shift+?',
    category: 'general',
  },
];
