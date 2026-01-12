/**
 * API Error Handling Middleware
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.7
 */

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { logger } from './logger';

// ============================================================================
// Custom Error Classes
// ============================================================================

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details?: any) {
    super(400, message, details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends ApiError {
  constructor(message: string = 'Authentication required') {
    super(401, message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends ApiError {
  constructor(message: string = 'Insufficient permissions') {
    super(403, message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string, id?: string) {
    const message = id 
      ? `${resource} with ID '${id}' not found`
      : `${resource} not found`;
    super(404, message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends ApiError {
  constructor(message: string, details?: any) {
    super(409, message, details);
    this.name = 'ConflictError';
  }
}

export class InternalServerError extends ApiError {
  constructor(message: string = 'Internal server error', details?: any) {
    super(500, message, details);
    this.name = 'InternalServerError';
  }
}

// ============================================================================
// Error Response Formatters
// ============================================================================

interface ErrorResponse {
  error: string;
  message: string;
  details?: any;
  errorId?: string;
}

/**
 * Format validation error from Zod
 */
function formatValidationError(error: ZodError): ErrorResponse {
  return {
    error: 'Validation failed',
    message: 'Request validation failed',
    details: error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    })),
  };
}

/**
 * Format authentication error
 */
function formatAuthenticationError(): ErrorResponse {
  return {
    error: 'Authentication required',
    message: 'Please log in to access this resource',
  };
}

/**
 * Format authorization error
 */
function formatAuthorizationError(message?: string): ErrorResponse {
  return {
    error: 'Insufficient permissions',
    message: message || 'You do not have permission to perform this action',
  };
}

/**
 * Format not found error
 */
function formatNotFoundError(message: string): ErrorResponse {
  return {
    error: 'Resource not found',
    message,
  };
}

/**
 * Format conflict error (e.g., duplicate key)
 */
function formatConflictError(message: string, details?: any): ErrorResponse {
  return {
    error: 'Conflict',
    message,
    details,
  };
}

/**
 * Format internal server error
 */
function formatInternalServerError(errorId: string): ErrorResponse {
  return {
    error: 'Internal server error',
    message: 'An unexpected error occurred. Please try again later.',
    errorId,
  };
}

// ============================================================================
// Error Handler Function
// ============================================================================

/**
 * Main error handler that catches and formats all API errors
 * Returns appropriate NextResponse with status code and error details
 */
export function handleApiError(error: any, context?: Record<string, any>): NextResponse {
  // Handle Zod validation errors
  if (error instanceof ZodError) {
    logger.warn('Validation error', { ...context, errors: error.issues });
    return NextResponse.json(
      formatValidationError(error),
      { status: 400 }
    );
  }

  // Handle custom API errors
  if (error instanceof ApiError) {
    const logLevel = error.statusCode >= 500 ? 'error' : 'warn';
    
    if (logLevel === 'error') {
      const errorId = logger.error(error.message, error, context);
      return NextResponse.json(
        {
          error: error.name,
          message: error.message,
          details: error.details,
          errorId,
        },
        { status: error.statusCode }
      );
    } else {
      logger.warn(error.message, { ...context, details: error.details });
      return NextResponse.json(
        {
          error: error.name,
          message: error.message,
          details: error.details,
        },
        { status: error.statusCode }
      );
    }
  }

  // Handle MongoDB duplicate key errors
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || 'field';
    const message = `Duplicate ${field}: A record with this ${field} already exists`;
    logger.warn('Duplicate key error', { ...context, field, error: error.message });
    return NextResponse.json(
      formatConflictError(message, { field }),
      { status: 409 }
    );
  }

  // Handle MongoDB validation errors
  if (error.name === 'ValidationError' && error.errors) {
    const details = Object.keys(error.errors).map((key) => ({
      field: key,
      message: error.errors[key].message,
    }));
    logger.warn('MongoDB validation error', { ...context, details });
    return NextResponse.json(
      {
        error: 'Validation failed',
        message: 'Database validation failed',
        details,
      },
      { status: 400 }
    );
  }

  // Handle MongoDB cast errors (invalid ObjectId, etc.)
  if (error.name === 'CastError') {
    logger.warn('Cast error', { ...context, error: error.message });
    return NextResponse.json(
      {
        error: 'Invalid input',
        message: `Invalid ${error.path}: ${error.value}`,
      },
      { status: 400 }
    );
  }

  // Handle all other errors as internal server errors
  const errorId = logger.error('Unhandled error in API route', error, context);
  return NextResponse.json(
    formatInternalServerError(errorId),
    { status: 500 }
  );
}

// ============================================================================
// Async Handler Wrapper
// ============================================================================

type AsyncHandler = (...args: any[]) => Promise<NextResponse>;

/**
 * Wraps an async API route handler with error handling
 * Usage: export const GET = withErrorHandling(async (request) => { ... });
 */
export function withErrorHandling(
  handler: AsyncHandler,
  context?: Record<string, any>
): AsyncHandler {
  return async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error, context);
    }
  };
}

// ============================================================================
// Validation Helper
// ============================================================================

/**
 * Validates request body against a Zod schema
 * Throws ValidationError if validation fails
 */
export async function validateRequestBody<T>(
  request: Request,
  schema: any
): Promise<T> {
  try {
    const body = await request.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      throw error;
    }
    throw new ValidationError('Invalid JSON in request body');
  }
}

/**
 * Validates query parameters against a Zod schema
 * Throws ValidationError if validation fails
 */
export function validateQueryParams<T>(
  searchParams: URLSearchParams,
  schema: any
): T {
  const params: Record<string, any> = {};
  
  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  try {
    return schema.parse(params);
  } catch (error) {
    if (error instanceof ZodError) {
      throw error;
    }
    throw new ValidationError('Invalid query parameters');
  }
}

// ============================================================================
// Database Error Helpers
// ============================================================================

/**
 * Check if a database record exists, throw NotFoundError if not
 */
export function ensureExists<T>(
  record: T | null,
  resourceName: string,
  id?: string
): T {
  if (!record) {
    throw new NotFoundError(resourceName, id);
  }
  return record;
}

/**
 * Handle database operation with error logging
 */
export async function withDbErrorHandling<T>(
  operation: () => Promise<T>,
  operationName: string,
  context?: Record<string, any>
): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    // Re-throw API errors as-is
    if (error instanceof ApiError) {
      throw error;
    }

    // Log and wrap database errors
    logger.error(`Database operation failed: ${operationName}`, error, context);
    throw new InternalServerError(`Failed to ${operationName}`);
  }
}
