/**
 * Offline Manager
 * 
 * Detects when the user goes offline/online and provides utilities
 * to queue actions for retry when connection is restored.
 */

import { useEffect, useState, useCallback } from 'react';

export type NetworkStatus = 'online' | 'offline';

export interface QueuedAction {
  id: string;
  action: () => Promise<any>;
  retryCount: number;
  maxRetries: number;
  timestamp: number;
  description?: string;
}

class OfflineManager {
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private listeners: Set<(status: NetworkStatus) => void> = new Set();
  private actionQueue: QueuedAction[] = [];
  private isProcessingQueue: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      // Listen for online/offline events
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);

      // Also check connection periodically by trying to fetch a small resource
      this.startConnectionCheck();
    }
  }

  /**
   * Get current network status
   */
  public getStatus(): NetworkStatus {
    return this.isOnline ? 'online' : 'offline';
  }

  /**
   * Check if currently online
   */
  public isConnected(): boolean {
    return this.isOnline;
  }

  /**
   * Subscribe to network status changes
   */
  public subscribe(listener: (status: NetworkStatus) => void): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Queue an action to be retried when back online
   */
  public queueAction(
    action: () => Promise<any>,
    options: {
      maxRetries?: number;
      description?: string;
    } = {}
  ): string {
    const id = `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const queuedAction: QueuedAction = {
      id,
      action,
      retryCount: 0,
      maxRetries: options.maxRetries ?? 3,
      timestamp: Date.now(),
      description: options.description,
    };

    this.actionQueue.push(queuedAction);
    console.log(`[OfflineManager] Queued action: ${id}`, options.description);

    // If we're online, try to process immediately
    if (this.isOnline) {
      this.processQueue();
    }

    return id;
  }

  /**
   * Remove an action from the queue
   */
  public removeAction(id: string): boolean {
    const index = this.actionQueue.findIndex((action) => action.id === id);
    if (index !== -1) {
      this.actionQueue.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get all queued actions
   */
  public getQueuedActions(): QueuedAction[] {
    return [...this.actionQueue];
  }

  /**
   * Clear all queued actions
   */
  public clearQueue(): void {
    this.actionQueue = [];
  }

  /**
   * Handle online event
   */
  private handleOnline = (): void => {
    console.log('[OfflineManager] Connection restored');
    this.isOnline = true;
    this.notifyListeners('online');
    
    // Process queued actions
    this.processQueue();
  };

  /**
   * Handle offline event
   */
  private handleOffline = (): void => {
    console.log('[OfflineManager] Connection lost');
    this.isOnline = false;
    this.notifyListeners('offline');
  };

  /**
   * Notify all listeners of status change
   */
  private notifyListeners(status: NetworkStatus): void {
    this.listeners.forEach((listener) => {
      try {
        listener(status);
      } catch (error) {
        console.error('[OfflineManager] Error in listener:', error);
      }
    });
  }

  /**
   * Process queued actions
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || !this.isOnline || this.actionQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    console.log(`[OfflineManager] Processing ${this.actionQueue.length} queued actions`);

    // Process actions one by one
    while (this.actionQueue.length > 0 && this.isOnline) {
      const queuedAction = this.actionQueue[0];

      try {
        console.log(`[OfflineManager] Executing action: ${queuedAction.id}`);
        await queuedAction.action();
        
        // Success - remove from queue
        this.actionQueue.shift();
        console.log(`[OfflineManager] Action completed: ${queuedAction.id}`);
      } catch (error) {
        console.error(`[OfflineManager] Action failed: ${queuedAction.id}`, error);
        
        queuedAction.retryCount++;
        
        if (queuedAction.retryCount >= queuedAction.maxRetries) {
          // Max retries reached - remove from queue
          console.error(
            `[OfflineManager] Action failed after ${queuedAction.maxRetries} retries: ${queuedAction.id}`
          );
          this.actionQueue.shift();
        } else {
          // Move to end of queue for retry
          this.actionQueue.shift();
          this.actionQueue.push(queuedAction);
        }
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Periodically check connection by trying to fetch a small resource
   */
  private startConnectionCheck(): void {
    setInterval(async () => {
      try {
        // Try to fetch a small image or endpoint
        const response = await fetch('/api/health', {
          method: 'HEAD',
          cache: 'no-cache',
        });

        if (response.ok && !this.isOnline) {
          // We're back online
          this.handleOnline();
        }
      } catch (error) {
        if (this.isOnline) {
          // We went offline
          this.handleOffline();
        }
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
    this.listeners.clear();
    this.actionQueue = [];
  }
}

// Singleton instance
export const offlineManager = new OfflineManager();

/**
 * React hook to use offline detection
 * 
 * @returns [isOnline, queueAction]
 * 
 * @example
 * ```typescript
 * const [isOnline, queueAction] = useOfflineDetection();
 * 
 * const handleSubmit = async () => {
 *   if (!isOnline) {
 *     queueAction(
 *       () => submitForm(data),
 *       { description: 'Submit form' }
 *     );
 *     toast.info('Action queued. Will retry when online.');
 *     return;
 *   }
 *   
 *   await submitForm(data);
 * };
 * ```
 */
export function useOfflineDetection(): [
  boolean,
  (action: () => Promise<any>, options?: { maxRetries?: number; description?: string }) => string
] {
  const [isOnline, setIsOnline] = useState(offlineManager.isConnected());

  useEffect(() => {
    const unsubscribe = offlineManager.subscribe((status) => {
      setIsOnline(status === 'online');
    });

    return unsubscribe;
  }, []);

  const queueAction = useCallback(
    (
      action: () => Promise<any>,
      options?: { maxRetries?: number; description?: string }
    ) => {
      return offlineManager.queueAction(action, options);
    },
    []
  );

  return [isOnline, queueAction];
}

/**
 * React hook to get network status
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(offlineManager.getStatus());

  useEffect(() => {
    const unsubscribe = offlineManager.subscribe(setStatus);
    return unsubscribe;
  }, []);

  return status;
}

/**
 * React hook to get queued actions
 */
export function useQueuedActions(): QueuedAction[] {
  const [actions, setActions] = useState<QueuedAction[]>(offlineManager.getQueuedActions());

  useEffect(() => {
    // Update actions list when network status changes
    const unsubscribe = offlineManager.subscribe(() => {
      setActions(offlineManager.getQueuedActions());
    });

    // Also update periodically
    const interval = setInterval(() => {
      setActions(offlineManager.getQueuedActions());
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return actions;
}
