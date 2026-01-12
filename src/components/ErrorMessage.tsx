import React from 'react';
import { AlertCircle, XCircle, Database, WifiOff, Server, AlertTriangle } from 'lucide-react';
import { formatErrorForDisplay, getErrorIcon } from '@/lib/error-messages';
import { Button } from './Button';

interface ErrorMessageProps {
  message?: string;
  title?: string;
  error?: any; // Raw error object for automatic formatting
  variant?: 'error' | 'warning';
  onDismiss?: () => void;
  onRetry?: () => void;
  className?: string;
  showAction?: boolean;
}

export default function ErrorMessage({
  message,
  title,
  error,
  variant = 'error',
  onDismiss,
  onRetry,
  className = '',
  showAction = true,
}: ErrorMessageProps) {
  // If error object is provided, format it automatically
  let displayTitle = title;
  let displayMessage = message;
  let actionText: string | undefined;
  let isRetryable = false;

  if (error && !message) {
    const formatted = formatErrorForDisplay(error);
    displayTitle = displayTitle || formatted.title;
    displayMessage = formatted.message;
    actionText = formatted.action;
    isRetryable = formatted.isRetryable;
  }

  const variantStyles = {
    error: {
      container: 'bg-red-50 border-red-200 text-red-800',
      icon: 'text-red-500',
      IconComponent: XCircle,
    },
    warning: {
      container: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      icon: 'text-yellow-500',
      IconComponent: AlertCircle,
    },
  };

  const style = variantStyles[variant];
  
  // Get appropriate icon based on error type
  let IconComponent = style.IconComponent;
  if (error) {
    const iconName = getErrorIcon(error);
    switch (iconName) {
      case 'Database':
        IconComponent = Database;
        break;
      case 'WifiOff':
        IconComponent = WifiOff;
        break;
      case 'Server':
        IconComponent = Server;
        break;
      case 'AlertTriangle':
        IconComponent = AlertTriangle;
        break;
      default:
        IconComponent = AlertCircle;
    }
  }

  return (
    <div
      className={`border rounded-lg p-4 ${style.container} ${className}`}
      role="alert"
    >
      <div className="flex items-start">
        <IconComponent className={`w-5 h-5 ${style.icon} mt-0.5 flex-shrink-0`} />
        <div className="ml-3 flex-1">
          {displayTitle && (
            <h3 className="text-sm font-semibold mb-1">{displayTitle}</h3>
          )}
          <p className="text-sm">{displayMessage || 'An error occurred'}</p>
          {showAction && actionText && (
            <p className="text-sm mt-2 text-gray-600">{actionText}</p>
          )}
          {showAction && isRetryable && onRetry && (
            <div className="mt-3">
              <Button onClick={onRetry} variant="secondary" size="sm">
                Try Again
              </Button>
            </div>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-3 flex-shrink-0 text-gray-400 hover:text-gray-600"
            aria-label="Dismiss"
          >
            <XCircle className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
