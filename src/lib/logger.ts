/**
 * Error logging utility with error ID generation
 * Requirements: 14.7
 */

import { randomBytes } from 'crypto';

export type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';

export interface LogContext {
  [key: string]: any;
}

export interface ErrorLog {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  errorId?: string;
}

/**
 * Generate a unique error ID for tracking
 */
export function generateErrorId(): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(6).toString('hex');
  return `err_${timestamp}_${random}`;
}

/**
 * Format error object for logging
 */
function formatError(error: any): ErrorLog['error'] {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  
  if (typeof error === 'object' && error !== null) {
    return {
      name: error.name || 'UnknownError',
      message: error.message || String(error),
      stack: error.stack,
    };
  }
  
  return {
    name: 'UnknownError',
    message: String(error),
  };
}

/**
 * Create a structured log entry
 */
function createLogEntry(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: any
): ErrorLog {
  const logEntry: ErrorLog = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };

  if (context && Object.keys(context).length > 0) {
    logEntry.context = context;
  }

  if (error) {
    logEntry.error = formatError(error);
    logEntry.errorId = generateErrorId();
  }

  return logEntry;
}

/**
 * Output log to console with appropriate formatting
 */
function outputLog(logEntry: ErrorLog): void {
  const { level, errorId } = logEntry;
  
  // Format for console output
  const logMessage = errorId 
    ? `[${level}] ${logEntry.message} (Error ID: ${errorId})`
    : `[${level}] ${logEntry.message}`;

  switch (level) {
    case 'ERROR':
      console.error(logMessage, logEntry);
      break;
    case 'WARN':
      console.warn(logMessage, logEntry);
      break;
    case 'INFO':
      console.info(logMessage, logEntry);
      break;
    case 'DEBUG':
      console.debug(logMessage, logEntry);
      break;
  }

  // In production, you would also send to monitoring service here
  // Example: sendToMonitoringService(logEntry);
}

/**
 * Logger class with methods for different log levels
 */
class Logger {
  /**
   * Log an error with full stack trace
   */
  error(message: string, error?: any, context?: LogContext): string {
    const logEntry = createLogEntry('ERROR', message, context, error);
    outputLog(logEntry);
    return logEntry.errorId || '';
  }

  /**
   * Log a warning
   */
  warn(message: string, context?: LogContext): void {
    const logEntry = createLogEntry('WARN', message, context);
    outputLog(logEntry);
  }

  /**
   * Log informational message
   */
  info(message: string, context?: LogContext): void {
    const logEntry = createLogEntry('INFO', message, context);
    outputLog(logEntry);
  }

  /**
   * Log debug information (only in development)
   */
  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === 'development') {
      const logEntry = createLogEntry('DEBUG', message, context);
      outputLog(logEntry);
    }
  }

  /**
   * Log API request for debugging
   */
  logRequest(method: string, path: string, context?: LogContext): void {
    this.debug(`API Request: ${method} ${path}`, context);
  }

  /**
   * Log API response for debugging
   */
  logResponse(method: string, path: string, status: number, context?: LogContext): void {
    this.debug(`API Response: ${method} ${path} - ${status}`, context);
  }

  /**
   * Log database operation
   */
  logDbOperation(operation: string, collection: string, context?: LogContext): void {
    this.debug(`DB Operation: ${operation} on ${collection}`, context);
  }

  /**
   * Log WebSocket event
   */
  logWebSocketEvent(event: string, context?: LogContext): void {
    this.debug(`WebSocket Event: ${event}`, context);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for testing
export { Logger };
