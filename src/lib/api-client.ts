/**
 * API Client with retry logic and exponential backoff
 * 
 * This module provides a fetch wrapper that automatically retries failed requests
 * with exponential backoff. It does not retry on 4xx client errors.
 */

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryOn?: (response: Response, error?: Error) => boolean;
}

interface FetchOptions extends RequestInit {
  retry?: RetryOptions;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  retryOn: (response: Response, error?: Error) => {
    // Retry on network errors
    if (error) {
      return true;
    }
    
    // Retry on 5xx server errors and 429 (Too Many Requests)
    if (response.status >= 500 || response.status === 429) {
      return true;
    }
    
    // Don't retry on 4xx client errors
    if (response.status >= 400 && response.status < 500) {
      return false;
    }
    
    // Retry on other non-2xx responses
    return !response.ok;
  },
};

/**
 * Calculate delay for exponential backoff
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  backoffMultiplier: number
): number {
  const delay = initialDelay * Math.pow(backoffMultiplier, attempt);
  return Math.min(delay, maxDelay);
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch with retry logic and exponential backoff
 * 
 * @param url - The URL to fetch
 * @param options - Fetch options including retry configuration
 * @returns Promise resolving to the Response
 * 
 * @example
 * ```typescript
 * const response = await fetchWithRetry('/api/data', {
 *   method: 'GET',
 *   retry: {
 *     maxRetries: 3,
 *     initialDelay: 1000,
 *   }
 * });
 * ```
 */
export async function fetchWithRetry(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { retry, ...fetchOptions } = options;
  const retryOptions = { ...DEFAULT_RETRY_OPTIONS, ...retry };

  let lastError: Error | undefined;
  let lastResponse: Response | undefined;

  for (let attempt = 0; attempt <= retryOptions.maxRetries; attempt++) {
    try {
      const response = await fetch(url, fetchOptions);
      lastResponse = response;

      // Check if we should retry
      const shouldRetry = retryOptions.retryOn(response, undefined);

      if (!shouldRetry || attempt === retryOptions.maxRetries) {
        return response;
      }

      // Calculate delay and wait before retrying
      const delay = calculateDelay(
        attempt,
        retryOptions.initialDelay,
        retryOptions.maxDelay,
        retryOptions.backoffMultiplier
      );

      console.warn(
        `Request to ${url} failed with status ${response.status}. ` +
        `Retrying in ${delay}ms (attempt ${attempt + 1}/${retryOptions.maxRetries})...`
      );

      await sleep(delay);
    } catch (error) {
      lastError = error as Error;

      // Check if we should retry on this error
      const shouldRetry = retryOptions.retryOn(
        new Response(null, { status: 0 }),
        lastError
      );

      if (!shouldRetry || attempt === retryOptions.maxRetries) {
        throw error;
      }

      // Calculate delay and wait before retrying
      const delay = calculateDelay(
        attempt,
        retryOptions.initialDelay,
        retryOptions.maxDelay,
        retryOptions.backoffMultiplier
      );

      console.warn(
        `Request to ${url} failed with error: ${lastError.message}. ` +
        `Retrying in ${delay}ms (attempt ${attempt + 1}/${retryOptions.maxRetries})...`
      );

      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript needs it
  if (lastResponse) {
    return lastResponse;
  }
  throw lastError || new Error('Request failed after all retries');
}

/**
 * API Client class with convenience methods
 */
export class ApiClient {
  private baseUrl: string;
  private defaultRetryOptions: RetryOptions;

  constructor(baseUrl: string = '', retryOptions: RetryOptions = {}) {
    this.baseUrl = baseUrl;
    this.defaultRetryOptions = retryOptions;
  }

  /**
   * GET request with retry
   */
  async get<T = any>(url: string, options: FetchOptions = {}): Promise<T> {
    const response = await fetchWithRetry(this.baseUrl + url, {
      method: 'GET',
      ...options,
      retry: { ...this.defaultRetryOptions, ...options.retry },
    });

    if (!response.ok) {
      throw new Error(`GET ${url} failed with status ${response.status}`);
    }

    return response.json();
  }

  /**
   * POST request with retry
   */
  async post<T = any>(
    url: string,
    data?: any,
    options: FetchOptions = {}
  ): Promise<T> {
    const response = await fetchWithRetry(this.baseUrl + url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
      ...options,
      retry: { ...this.defaultRetryOptions, ...options.retry },
    });

    if (!response.ok) {
      throw new Error(`POST ${url} failed with status ${response.status}`);
    }

    return response.json();
  }

  /**
   * PUT request with retry
   */
  async put<T = any>(
    url: string,
    data?: any,
    options: FetchOptions = {}
  ): Promise<T> {
    const response = await fetchWithRetry(this.baseUrl + url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
      ...options,
      retry: { ...this.defaultRetryOptions, ...options.retry },
    });

    if (!response.ok) {
      throw new Error(`PUT ${url} failed with status ${response.status}`);
    }

    return response.json();
  }

  /**
   * DELETE request with retry
   */
  async delete<T = any>(url: string, options: FetchOptions = {}): Promise<T> {
    const response = await fetchWithRetry(this.baseUrl + url, {
      method: 'DELETE',
      ...options,
      retry: { ...this.defaultRetryOptions, ...options.retry },
    });

    if (!response.ok) {
      throw new Error(`DELETE ${url} failed with status ${response.status}`);
    }

    return response.json();
  }

  /**
   * PATCH request with retry
   */
  async patch<T = any>(
    url: string,
    data?: any,
    options: FetchOptions = {}
  ): Promise<T> {
    const response = await fetchWithRetry(this.baseUrl + url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
      ...options,
      retry: { ...this.defaultRetryOptions, ...options.retry },
    });

    if (!response.ok) {
      throw new Error(`PATCH ${url} failed with status ${response.status}`);
    }

    return response.json();
  }
}

/**
 * Default API client instance
 */
export const apiClient = new ApiClient('', {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
});

/**
 * Helper function to check if an error is a network error
 */
export function isNetworkError(error: any): boolean {
  return (
    error instanceof TypeError &&
    (error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('Failed to fetch'))
  );
}

/**
 * Helper function to check if a response indicates a server error
 */
export function isServerError(response: Response): boolean {
  return response.status >= 500 && response.status < 600;
}

/**
 * Helper function to check if a response indicates a client error
 */
export function isClientError(response: Response): boolean {
  return response.status >= 400 && response.status < 500;
}
