'use client';

import { ConnectionStatus } from '@/lib/websocket-manager';

interface ConnectionIndicatorProps {
  status: ConnectionStatus;
  frameRate?: number;
  latency?: number;
  statusMessage?: string;
  reconnectAttempts?: number;
  className?: string;
}

export default function ConnectionIndicator({
  status,
  frameRate,
  latency,
  statusMessage,
  reconnectAttempts,
  className = '',
}: ConnectionIndicatorProps) {
  // Determine status color and icon
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          color: 'bg-green-500',
          textColor: 'text-green-700',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          label: 'Connected',
          icon: '●',
        };
      case 'reconnecting':
        return {
          color: 'bg-yellow-500',
          textColor: 'text-yellow-700',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          label: 'Reconnecting',
          icon: '◐',
        };
      case 'disconnected':
        return {
          color: 'bg-red-500',
          textColor: 'text-red-700',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          label: 'Disconnected',
          icon: '○',
        };
      default:
        return {
          color: 'bg-gray-500',
          textColor: 'text-gray-700',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          label: 'Unknown',
          icon: '?',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div
      className={`inline-flex items-center gap-3 px-4 py-2 rounded-lg border ${config.bgColor} ${config.borderColor} ${className}`}
    >
      {/* Status indicator */}
      <div className="flex items-center gap-2">
        <span
          className={`inline-block w-3 h-3 rounded-full ${config.color} ${
            status === 'reconnecting' ? 'animate-pulse' : ''
          }`}
          aria-label={`Status: ${config.label}`}
        />
        <div className="flex flex-col">
          <span className={`text-sm font-medium ${config.textColor}`}>
            {config.label}
          </span>
          {/* Show status message for reconnecting state */}
          {status === 'reconnecting' && statusMessage && (
            <span className="text-xs text-gray-500">
              {statusMessage}
            </span>
          )}
          {/* Show reconnect attempts for disconnected state */}
          {status === 'disconnected' && reconnectAttempts !== undefined && reconnectAttempts > 0 && (
            <span className="text-xs text-gray-500">
              Failed after {reconnectAttempts} attempts
            </span>
          )}
        </div>
      </div>

      {/* Metrics (only show when connected) */}
      {status === 'connected' && (
        <>
          {/* Frame rate */}
          {frameRate !== undefined && (
            <div className="flex items-center gap-1 text-sm text-gray-600 border-l border-gray-300 pl-3">
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
                  d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
                />
              </svg>
              <span className="font-mono">{frameRate} FPS</span>
            </div>
          )}

          {/* Latency */}
          {latency !== undefined && (
            <div className="flex items-center gap-1 text-sm text-gray-600 border-l border-gray-300 pl-3">
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
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              <span className="font-mono">{latency}ms</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
