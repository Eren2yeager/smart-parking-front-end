'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './Button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'global' | 'page' | 'component';
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component that catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing the entire application.
 * 
 * Supports different levels: global (app-wide), page (per-page), and component (per-component).
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console
    console.error('Error caught by ErrorBoundary:', error, errorInfo);

    // Log to monitoring service (e.g., Sentry, LogRocket, etc.)
    this.logErrorToService(error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private logErrorToService(error: Error, errorInfo: ErrorInfo): void {
    // In production, this would send to a monitoring service
    // For now, we'll just log to console with structured data
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      level: this.props.level || 'component',
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    };

    console.error('[Error Monitoring]', JSON.stringify(errorData, null, 2));

    // TODO: Send to actual monitoring service
    // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
  }

  private handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }

      // Default fallback UI based on level
      return this.renderDefaultFallback();
    }

    return this.props.children;
  }

  private renderDefaultFallback(): ReactNode {
    const { level = 'component' } = this.props;
    const { error } = this.state;

    if (level === 'global') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="mb-4">
              <svg
                className="mx-auto h-16 w-16 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Something went wrong
            </h1>
            <p className="text-gray-600 mb-6">
              We're sorry, but something unexpected happened. Please try refreshing the page.
            </p>
            {error && (
              <details className="mb-6 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Error details
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 p-3 rounded overflow-auto max-h-40">
                  {error.message}
                </pre>
              </details>
            )}
            <div className="flex gap-3 justify-center">
              <Button onClick={this.handleReset} variant="primary">
                Try Again
              </Button>
              <Button
                onClick={() => window.location.href = '/'}
                variant="secondary"
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (level === 'page') {
      return (
        <div className="flex items-center justify-center min-h-[400px] px-4">
          <div className="max-w-md w-full bg-white rounded-lg border border-gray-200 p-6 text-center">
            <div className="mb-4">
              <svg
                className="mx-auto h-12 w-12 text-yellow-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Page Error
            </h2>
            <p className="text-gray-600 mb-4">
              This page encountered an error. You can try reloading or go back to the previous page.
            </p>
            {error && (
              <details className="mb-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Error details
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 p-3 rounded overflow-auto max-h-32">
                  {error.message}
                </pre>
              </details>
            )}
            <div className="flex gap-3 justify-center">
              <Button onClick={this.handleReset} variant="primary" size="sm">
                Reload Page
              </Button>
              <Button
                onClick={() => window.history.back()}
                variant="secondary"
                size="sm"
              >
                Go Back
              </Button>
            </div>
          </div>
        </div>
      );
    }

    // Component level fallback
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-red-800">
              Component Error
            </h3>
            <p className="mt-1 text-sm text-red-700">
              This component failed to load. Please try again.
            </p>
            {error && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-red-600 hover:text-red-800">
                  Show details
                </summary>
                <pre className="mt-1 text-xs bg-red-100 p-2 rounded overflow-auto max-h-24">
                  {error.message}
                </pre>
              </details>
            )}
            <div className="mt-3">
              <Button onClick={this.handleReset} variant="secondary" size="sm">
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

/**
 * Global Error Boundary for the entire application
 */
export function GlobalErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary level="global">
      {children}
    </ErrorBoundary>
  );
}

/**
 * Page-level Error Boundary for individual pages
 */
export function PageErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary level="page">
      {children}
    </ErrorBoundary>
  );
}

/**
 * Component-level Error Boundary for individual components
 */
export function ComponentErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary level="component">
      {children}
    </ErrorBoundary>
  );
}
