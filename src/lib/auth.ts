import { auth } from '@/app/api/auth/[...nextauth]/route';
import { NextResponse } from 'next/server';

/**
 * Get the current authenticated session
 * @returns Session object or null if not authenticated
 */
export async function getSession() {
  return await auth();
}

/**
 * Require authentication for a route
 * Throws an error if user is not authenticated
 * @returns Session object
 */
export async function requireAuth() {
  const session = await getSession();

  if (!session || !session.user) {
    throw new AuthenticationError('Authentication required');
  }

  return session;
}

/**
 * Require specific role for a route
 * Throws an error if user doesn't have the required role
 * @param allowedRoles - Array of roles that are allowed
 * @returns Session object
 */
export async function requireRole(allowedRoles: Array<'admin' | 'operator' | 'viewer'>) {
  const session = await requireAuth();

  if (!allowedRoles.includes(session.user.role)) {
    throw new AuthorizationError(
      `Insufficient permissions. Required roles: ${allowedRoles.join(', ')}`
    );
  }

  return session;
}

/**
 * Check if user has a specific role
 * @param session - Session object
 * @param role - Role to check
 * @returns True if user has the role
 */
export function hasRole(
  session: { user: { role: 'admin' | 'operator' | 'viewer' } },
  role: 'admin' | 'operator' | 'viewer'
): boolean {
  return session.user.role === role;
}

/**
 * Check if user has admin role
 * @param session - Session object
 * @returns True if user is admin
 */
export function isAdmin(session: { user: { role: 'admin' | 'operator' | 'viewer' } }): boolean {
  return session.user.role === 'admin';
}

/**
 * Check if user has operator or admin role
 * @param session - Session object
 * @returns True if user is operator or admin
 */
export function isOperatorOrAdmin(session: { user: { role: 'admin' | 'operator' | 'viewer' } }): boolean {
  return session.user.role === 'operator' || session.user.role === 'admin';
}

/**
 * Custom error for authentication failures
 */
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Custom error for authorization failures
 */
export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Handle authentication errors in API routes
 * @param error - Error object
 * @returns NextResponse with appropriate status code
 */
export function handleAuthError(error: unknown): NextResponse {
  if (error instanceof AuthenticationError) {
    return NextResponse.json(
      { error: 'Authentication required', message: error.message },
      { status: 401 }
    );
  }

  if (error instanceof AuthorizationError) {
    return NextResponse.json(
      { error: 'Insufficient permissions', message: error.message },
      { status: 403 }
    );
  }

  // Generic error
  console.error('Auth error:', error);
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}
