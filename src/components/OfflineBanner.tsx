'use client';

import { useNetworkStatus, useQueuedActions } from '@/lib/offline-manager';

interface OfflineBannerProps {
  className?: string;
}

/**
 * Banner that displays when the user is offline
 * Shows the number of queued actions waiting to be retried
 */
export default function OfflineBanner({ className = '' }: OfflineBannerProps) {
  const networkStatus = useNetworkStatus();
  const queuedActions = useQueuedActions();

  if (networkStatus === 'online') {
    return null;
  }

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-white px-4 py-3 shadow-lg ${className}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg
            className="w-6 h-6 animate-pulse"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
            />
          </svg>
          <div>
            <p className="font-semibold">You are currently offline</p>
            <p className="text-sm text-yellow-100">
              {queuedActions.length > 0
                ? `${queuedActions.length} action${queuedActions.length !== 1 ? 's' : ''} queued for retry when connection is restored`
                : 'Some features may not be available'}
            </p>
          </div>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-white text-yellow-600 rounded-lg font-medium hover:bg-yellow-50 transition-colors"
          aria-label="Retry connection"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

/**
 * Compact offline indicator for use in headers or sidebars
 */
export function OfflineIndicator({ className = '' }: { className?: string }) {
  const networkStatus = useNetworkStatus();

  if (networkStatus === 'online') {
    return null;
  }

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1 bg-yellow-100 border border-yellow-300 rounded-full text-yellow-800 text-sm ${className}`}
      role="status"
      aria-live="polite"
    >
      <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
      <span className="font-medium">Offline</span>
    </div>
  );
}
