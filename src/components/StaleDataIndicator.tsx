'use client';

import { useEffect, useState } from 'react';
import { Button } from './Button';

interface StaleDataIndicatorProps {
  lastUpdated: Date | number | string;
  staleThresholdMinutes?: number;
  onRefresh?: () => void;
  className?: string;
  showTimestamp?: boolean;
  compact?: boolean;
}

/**
 * Component that displays a warning when data is stale (older than threshold)
 * and provides a refresh button to reload the data.
 * 
 * @param lastUpdated - Timestamp of when the data was last updated
 * @param staleThresholdMinutes - Minutes after which data is considered stale (default: 5)
 * @param onRefresh - Callback function to refresh the data
 * @param showTimestamp - Whether to show the "Last updated" timestamp (default: true)
 * @param compact - Use compact layout (default: false)
 */
export default function StaleDataIndicator({
  lastUpdated,
  staleThresholdMinutes = 5,
  onRefresh,
  className = '',
  showTimestamp = true,
  compact = false,
}: StaleDataIndicatorProps) {
  const [isStale, setIsStale] = useState(false);
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    const updateStaleStatus = () => {
      const lastUpdateTime = new Date(lastUpdated).getTime();
      const now = Date.now();
      const diffMinutes = (now - lastUpdateTime) / (1000 * 60);

      setIsStale(diffMinutes > staleThresholdMinutes);
      setTimeAgo(formatTimeAgo(lastUpdateTime));
    };

    // Update immediately
    updateStaleStatus();

    // Update every 30 seconds
    const interval = setInterval(updateStaleStatus, 30000);

    return () => clearInterval(interval);
  }, [lastUpdated, staleThresholdMinutes]);

  const formatTimeAgo = (timestamp: number): string => {
    const now = Date.now();
    const diffSeconds = Math.floor((now - timestamp) / 1000);

    if (diffSeconds < 60) {
      return 'just now';
    }

    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    }

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  };

  if (!showTimestamp && !isStale) {
    return null;
  }

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        {isStale && (
          <span
            className="inline-flex items-center gap-1 text-yellow-600"
            title="Data may be outdated"
          >
            <svg
              className="w-4 h-4"
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
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </span>
        )}
        {showTimestamp && (
          <span className="text-sm text-gray-500">
            Updated {timeAgo}
          </span>
        )}
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="text-blue-600 hover:text-blue-800 transition-colors"
            title="Refresh data"
            aria-label="Refresh data"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="flex items-center gap-2">
        {isStale && (
          <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
            <svg
              className="w-5 h-5 text-yellow-600"
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
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span className="text-sm font-medium text-yellow-800">
              Data may be outdated
            </span>
          </div>
        )}
        {showTimestamp && (
          <span className={`text-sm ${isStale ? 'text-yellow-700' : 'text-gray-500'}`}>
            Last updated {timeAgo}
          </span>
        )}
      </div>
      {onRefresh && (
        <Button
          onClick={onRefresh}
          variant="secondary"
          size="sm"
          className="ml-4"
        >
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </Button>
      )}
    </div>
  );
}

/**
 * Hook to check if data is stale
 */
export function useStaleData(
  lastUpdated: Date | number | string,
  staleThresholdMinutes: number = 5
): boolean {
  const [isStale, setIsStale] = useState(false);

  useEffect(() => {
    const checkStale = () => {
      const lastUpdateTime = new Date(lastUpdated).getTime();
      const now = Date.now();
      const diffMinutes = (now - lastUpdateTime) / (1000 * 60);
      setIsStale(diffMinutes > staleThresholdMinutes);
    };

    checkStale();
    const interval = setInterval(checkStale, 30000);

    return () => clearInterval(interval);
  }, [lastUpdated, staleThresholdMinutes]);

  return isStale;
}

/**
 * Utility function to format relative time
 */
export function formatRelativeTime(timestamp: Date | number | string): string {
  const time = new Date(timestamp).getTime();
  const now = Date.now();
  const diffSeconds = Math.floor((now - time) / 1000);

  if (diffSeconds < 60) {
    return 'just now';
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  }

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) {
    return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ago`;
  }

  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
}
