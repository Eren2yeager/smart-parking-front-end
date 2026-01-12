/**
 * Error Message Utilities
 * 
 * Provides user-friendly error messages for common error scenarios
 * including database errors, network errors, and backend errors.
 */

export interface ErrorDetails {
  message: string;
  action?: string;
  isRetryable: boolean;
  icon?: 'database' | 'network' | 'server' | 'client' | 'unknown';
}

/**
 * Check if an error is a network error
 */
export function isNetworkError(error: any): boolean {
  if (error instanceof TypeError) {
    return (
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('Failed to fetch')
    );
  }
  
  if (error?.code) {
    return ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ENETUNREACH'].includes(error.code);
  }

  return false;
}

/**
 * Check if an error is a database error
 */
export function isDatabaseError(error: any): boolean {
  if (error?.name === 'MongoError' || error?.name === 'MongoServerError') {
    return true;
  }

  if (error?.message) {
    const dbKeywords = [
      'database',
      'mongodb',
      'connection',
      'ECONNREFUSED',
      'topology',
      'buffering timed out',
    ];
    return dbKeywords.some((keyword) =>
      error.message.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  return false;
}

/**
 * Check if an error is a backend (Python) error
 */
export function isBackendError(error: any): boolean {
  if (error?.message) {
    const backendKeywords = [
      'python',
      'backend',
      'websocket',
      'ws://',
      'wss://',
      'port 8000',
    ];
    return backendKeywords.some((keyword) =>
      error.message.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  return false;
}

/**
 * Get user-friendly error message based on error type
 */
export function getUserFriendlyError(error: any): ErrorDetails {
  // Network errors
  if (isNetworkError(error)) {
    return {
      message: 'Unable to connect to the server. Please check your internet connection.',
      action: 'Check your connection and try again',
      isRetryable: true,
      icon: 'network',
    };
  }

  // Database errors
  if (isDatabaseError(error)) {
    return {
      message: 'Database connection error. The system is temporarily unavailable.',
      action: 'Please try again in a few moments. If the problem persists, contact support.',
      isRetryable: true,
      icon: 'database',
    };
  }

  // Backend (Python) errors
  if (isBackendError(error)) {
    return {
      message: 'AI processing service is offline. Live monitoring and detection features are unavailable.',
      action: 'The service will reconnect automatically. You can continue using other features.',
      isRetryable: true,
      icon: 'server',
    };
  }

  // HTTP status code errors
  if (error?.status || error?.statusCode) {
    const status = error.status || error.statusCode;

    if (status === 400) {
      return {
        message: 'Invalid request. Please check your input and try again.',
        action: 'Review the form fields and ensure all required information is provided correctly.',
        isRetryable: false,
        icon: 'client',
      };
    }

    if (status === 401) {
      return {
        message: 'Your session has expired. Please sign in again.',
        action: 'Click here to sign in',
        isRetryable: false,
        icon: 'client',
      };
    }

    if (status === 403) {
      return {
        message: 'You don\'t have permission to perform this action.',
        action: 'Contact an administrator if you believe this is an error.',
        isRetryable: false,
        icon: 'client',
      };
    }

    if (status === 404) {
      return {
        message: 'The requested resource was not found.',
        action: 'The item may have been deleted or moved. Try refreshing the page.',
        isRetryable: false,
        icon: 'client',
      };
    }

    if (status === 409) {
      return {
        message: 'This action conflicts with existing data.',
        action: 'The item may already exist or be in use. Please check and try again.',
        isRetryable: false,
        icon: 'client',
      };
    }

    if (status === 429) {
      return {
        message: 'Too many requests. Please slow down.',
        action: 'Wait a moment before trying again.',
        isRetryable: true,
        icon: 'server',
      };
    }

    if (status >= 500) {
      return {
        message: 'Server error. Something went wrong on our end.',
        action: 'Please try again in a few moments. If the problem persists, contact support.',
        isRetryable: true,
        icon: 'server',
      };
    }
  }

  // Validation errors
  if (error?.name === 'ValidationError' || error?.errors) {
    return {
      message: 'Please correct the errors in the form.',
      action: 'Check the highlighted fields and provide valid information.',
      isRetryable: false,
      icon: 'client',
    };
  }

  // Timeout errors
  if (error?.name === 'TimeoutError' || error?.message?.includes('timeout')) {
    return {
      message: 'The request took too long to complete.',
      action: 'Please try again. If the problem persists, the server may be experiencing high load.',
      isRetryable: true,
      icon: 'network',
    };
  }

  // Generic error
  return {
    message: error?.message || 'An unexpected error occurred.',
    action: 'Please try again. If the problem persists, contact support.',
    isRetryable: true,
    icon: 'unknown',
  };
}

/**
 * Format error for display in UI
 */
export function formatErrorForDisplay(error: any): {
  title: string;
  message: string;
  action?: string;
  isRetryable: boolean;
} {
  const details = getUserFriendlyError(error);

  let title = 'Error';
  if (details.icon === 'database') {
    title = 'Database Error';
  } else if (details.icon === 'network') {
    title = 'Connection Error';
  } else if (details.icon === 'server') {
    title = 'Server Error';
  } else if (details.icon === 'client') {
    title = 'Request Error';
  }

  return {
    title,
    message: details.message,
    action: details.action,
    isRetryable: details.isRetryable,
  };
}

/**
 * Get icon component name for error type
 */
export function getErrorIcon(error: any): string {
  const details = getUserFriendlyError(error);
  
  switch (details.icon) {
    case 'database':
      return 'Database';
    case 'network':
      return 'WifiOff';
    case 'server':
      return 'Server';
    case 'client':
      return 'AlertCircle';
    default:
      return 'AlertTriangle';
  }
}

/**
 * Check if error should trigger offline mode
 */
export function shouldTriggerOfflineMode(error: any): boolean {
  return isNetworkError(error) || (error?.status === 0);
}

/**
 * Get retry delay based on error type (in milliseconds)
 */
export function getRetryDelay(error: any, attemptNumber: number): number {
  const baseDelay = 1000; // 1 second
  const maxDelay = 30000; // 30 seconds

  // Exponential backoff
  const delay = Math.min(baseDelay * Math.pow(2, attemptNumber), maxDelay);

  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 1000;

  return delay + jitter;
}

/**
 * Determine if error should be retried
 */
export function shouldRetryError(error: any): boolean {
  const details = getUserFriendlyError(error);
  return details.isRetryable;
}

/**
 * Log error to monitoring service
 * In production, this would send to Sentry, LogRocket, etc.
 */
export function logErrorToMonitoring(error: any, context?: Record<string, any>): void {
  const errorData = {
    message: error?.message || 'Unknown error',
    stack: error?.stack,
    name: error?.name,
    status: error?.status || error?.statusCode,
    context,
    timestamp: new Date().toISOString(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
    url: typeof window !== 'undefined' ? window.location.href : 'unknown',
  };

  console.error('[Error Monitoring]', JSON.stringify(errorData, null, 2));

  // TODO: Send to actual monitoring service
  // Example: Sentry.captureException(error, { contexts: { custom: context } });
}
