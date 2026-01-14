import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';

// Force Node.js runtime instead of Edge runtime
export const runtime = 'nodejs';

// Define protected routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/parking-lots',
  '/contractors',
  '/records',
  '/violations',
  '/alerts',
  '/analytics',
  '/settings',
];

// Define admin-only routes
const adminRoutes = [
  '/parking-lots/new',
  '/contractors/new',
];

// Define routes that should be accessible without authentication
const publicRoutes = [
  '/login',
  '/api/auth',
  '/test-backend',
  '/camera',
  '/api/health',
  '/api/debug-session',
];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Allow public routes and auth callbacks
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow static files and assets
  if (pathname.includes('.') || pathname.startsWith('/_next')) {
    return NextResponse.next();
  }

  // Check if route is protected
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));

  if (isProtectedRoute || isAdminRoute) {
    // Check if user is authenticated
    if (!req.auth) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // For admin routes, check if user has admin role
    if (isAdminRoute && req.auth.user?.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  return NextResponse.next();
});

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
