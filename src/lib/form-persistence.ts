/**
 * Form Persistence Utilities
 * 
 * Provides hooks and utilities to save form state to localStorage
 * and restore it on page reload, preventing data loss.
 */

import { useEffect, useState, useCallback } from 'react';

const STORAGE_PREFIX = 'form_state_';
const STORAGE_EXPIRY_HOURS = 24;

interface StoredFormData<T> {
  data: T;
  timestamp: number;
}

/**
 * Save form data to localStorage
 */
export function saveFormData<T>(formId: string, data: T): void {
  try {
    const storageData: StoredFormData<T> = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(
      `${STORAGE_PREFIX}${formId}`,
      JSON.stringify(storageData)
    );
  } catch (error) {
    console.error('Failed to save form data:', error);
  }
}

/**
 * Load form data from localStorage
 */
export function loadFormData<T>(formId: string): T | null {
  try {
    const stored = localStorage.getItem(`${STORAGE_PREFIX}${formId}`);
    if (!stored) {
      return null;
    }

    const storageData: StoredFormData<T> = JSON.parse(stored);
    
    // Check if data has expired
    const hoursElapsed = (Date.now() - storageData.timestamp) / (1000 * 60 * 60);
    if (hoursElapsed > STORAGE_EXPIRY_HOURS) {
      clearFormData(formId);
      return null;
    }

    return storageData.data;
  } catch (error) {
    console.error('Failed to load form data:', error);
    return null;
  }
}

/**
 * Clear form data from localStorage
 */
export function clearFormData(formId: string): void {
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${formId}`);
  } catch (error) {
    console.error('Failed to clear form data:', error);
  }
}

/**
 * Check if form data exists in localStorage
 */
export function hasFormData(formId: string): boolean {
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}${formId}`) !== null;
  } catch (error) {
    return false;
  }
}

/**
 * Hook to persist form state to localStorage
 * 
 * @param formId - Unique identifier for the form
 * @param initialState - Initial state of the form
 * @param options - Configuration options
 * @returns [state, setState, clearState, hasRestoredData]
 * 
 * @example
 * ```typescript
 * const [formData, setFormData, clearFormData, hasRestoredData] = useFormPersistence(
 *   'parking-lot-form',
 *   { name: '', location: '', capacity: 0 }
 * );
 * 
 * // Use formData and setFormData like regular useState
 * // Data is automatically saved to localStorage on change
 * // Data is automatically restored on mount
 * 
 * // Clear saved data after successful submission
 * const handleSubmit = async () => {
 *   await submitForm(formData);
 *   clearFormData();
 * };
 * ```
 */
export function useFormPersistence<T>(
  formId: string,
  initialState: T,
  options: {
    debounceMs?: number;
    autoSave?: boolean;
    onRestore?: (data: T) => void;
  } = {}
): [T, (data: T | ((prev: T) => T)) => void, () => void, boolean] {
  const { debounceMs = 500, autoSave = true, onRestore } = options;
  
  const [state, setState] = useState<T>(() => {
    // Try to restore from localStorage on mount
    const restored = loadFormData<T>(formId);
    if (restored) {
      if (onRestore) {
        onRestore(restored);
      }
      return restored;
    }
    return initialState;
  });

  const [hasRestoredData] = useState(() => hasFormData(formId));
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // Save to localStorage when state changes (with debounce)
  useEffect(() => {
    if (!autoSave) {
      return;
    }

    // Clear existing timeout
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    // Set new timeout to save after debounce period
    const timeout = setTimeout(() => {
      saveFormData(formId, state);
    }, debounceMs);

    setSaveTimeout(timeout);

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [state, formId, debounceMs, autoSave]);

  // Clear saved data
  const clearState = useCallback(() => {
    clearFormData(formId);
  }, [formId]);

  return [state, setState, clearState, hasRestoredData];
}

/**
 * Hook to manually control form persistence
 * 
 * Useful when you want more control over when data is saved/loaded
 * 
 * @example
 * ```typescript
 * const { save, load, clear, hasData } = useManualFormPersistence('my-form');
 * 
 * const handleChange = (data) => {
 *   setFormData(data);
 *   save(data); // Manually save
 * };
 * 
 * useEffect(() => {
 *   const restored = load();
 *   if (restored) {
 *     setFormData(restored);
 *   }
 * }, []);
 * ```
 */
export function useManualFormPersistence<T>(formId: string) {
  const save = useCallback(
    (data: T) => {
      saveFormData(formId, data);
    },
    [formId]
  );

  const load = useCallback((): T | null => {
    return loadFormData<T>(formId);
  }, [formId]);

  const clear = useCallback(() => {
    clearFormData(formId);
  }, [formId]);

  const hasData = useCallback((): boolean => {
    return hasFormData(formId);
  }, [formId]);

  return { save, load, clear, hasData };
}

/**
 * Clear all expired form data from localStorage
 * Call this on app initialization to clean up old data
 */
export function clearExpiredFormData(): void {
  try {
    const keys = Object.keys(localStorage);
    const formKeys = keys.filter((key) => key.startsWith(STORAGE_PREFIX));

    formKeys.forEach((key) => {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const storageData: StoredFormData<any> = JSON.parse(stored);
          const hoursElapsed = (Date.now() - storageData.timestamp) / (1000 * 60 * 60);
          
          if (hoursElapsed > STORAGE_EXPIRY_HOURS) {
            localStorage.removeItem(key);
          }
        }
      } catch (error) {
        // If we can't parse it, remove it
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('Failed to clear expired form data:', error);
  }
}
