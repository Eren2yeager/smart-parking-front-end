'use client';

import React, { useEffect, useState } from 'react';
import { X, Keyboard } from 'lucide-react';
import { theme } from '@/lib/theme';
import { keyboardShortcuts, formatKeyCombo, KeyboardShortcut } from '@/lib/keyboard-shortcuts';

/**
 * KeyboardShortcutsHelp Component
 * 
 * Modal dialog that displays all available keyboard shortcuts.
 * Can be triggered by pressing Shift+? or clicking a help button.
 */

export interface KeyboardShortcutsHelpProps {
  /**
   * Whether the modal is open
   */
  isOpen: boolean;
  
  /**
   * Callback when modal is closed
   */
  onClose: () => void;
}

export function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([]);

  useEffect(() => {
    if (isOpen) {
      setShortcuts(keyboardShortcuts.getAll());
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    const category = shortcut.category || 'general';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  const categoryLabels: Record<string, string> = {
    navigation: 'Navigation',
    search: 'Search',
    actions: 'Actions',
    general: 'General',
  };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: theme.zIndex.modalBackdrop,
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: theme.colors.background.default,
          borderRadius: theme.borderRadius.lg,
          boxShadow: theme.shadows['2xl'],
          maxWidth: '600px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          zIndex: theme.zIndex.modal,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: theme.spacing[6],
            borderBottom: `1px solid ${theme.colors.border.light}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3] }}>
            <Keyboard
              style={{
                width: '1.5rem',
                height: '1.5rem',
                color: theme.colors.primary[500],
              }}
              aria-hidden="true"
            />
            <h2
              id="shortcuts-title"
              style={{
                fontSize: theme.typography.fontSize['2xl'],
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.text.primary,
                margin: 0,
              }}
            >
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: theme.spacing[2],
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: theme.borderRadius.md,
              cursor: 'pointer',
              color: theme.colors.text.secondary,
              transition: `all ${theme.transitions.duration.fast} ${theme.transitions.timing.ease}`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.neutral[100];
              e.currentTarget.style.color = theme.colors.text.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = theme.colors.text.secondary;
            }}
            aria-label="Close keyboard shortcuts dialog"
          >
            <X style={{ width: '1.25rem', height: '1.25rem' }} aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: theme.spacing[6] }}>
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category} style={{ marginBottom: theme.spacing[6] }}>
              <h3
                style={{
                  fontSize: theme.typography.fontSize.lg,
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: theme.colors.text.primary,
                  marginBottom: theme.spacing[4],
                }}
              >
                {categoryLabels[category] || category}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
                {categoryShortcuts.map((shortcut) => (
                  <div
                    key={shortcut.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: theme.spacing[3],
                      backgroundColor: theme.colors.neutral[50],
                      borderRadius: theme.borderRadius.md,
                    }}
                  >
                    <span
                      style={{
                        fontSize: theme.typography.fontSize.sm,
                        color: theme.colors.text.primary,
                      }}
                    >
                      {shortcut.description}
                    </span>
                    <kbd
                      style={{
                        padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
                        fontSize: theme.typography.fontSize.sm,
                        fontWeight: theme.typography.fontWeight.medium,
                        fontFamily: theme.typography.fontFamily.mono,
                        color: theme.colors.text.primary,
                        backgroundColor: theme.colors.background.default,
                        border: `1px solid ${theme.colors.border.main}`,
                        borderRadius: theme.borderRadius.sm,
                        boxShadow: theme.shadows.sm,
                      }}
                    >
                      {formatKeyCombo(shortcut.keys)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: theme.spacing[4],
            borderTop: `1px solid ${theme.colors.border.light}`,
            backgroundColor: theme.colors.neutral[50],
            borderBottomLeftRadius: theme.borderRadius.lg,
            borderBottomRightRadius: theme.borderRadius.lg,
          }}
        >
          <p
            style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.text.secondary,
              textAlign: 'center',
              margin: 0,
            }}
          >
            Press <kbd style={{ 
              padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
              fontFamily: theme.typography.fontFamily.mono,
              backgroundColor: theme.colors.background.default,
              border: `1px solid ${theme.colors.border.main}`,
              borderRadius: theme.borderRadius.sm,
            }}>ESC</kbd> to close
          </p>
        </div>
      </div>
    </>
  );
}

/**
 * Hook to manage keyboard shortcuts help modal
 */
export function useKeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen((prev) => !prev);

  return {
    isOpen,
    open,
    close,
    toggle,
  };
}

export default KeyboardShortcutsHelp;
