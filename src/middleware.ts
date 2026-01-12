import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Define protected routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/parking-lots',
  '/contractors',
  '/records',
  '/violations',
  '/alerts',
  '/analytics',
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
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check if route is protected
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));

  if (isProtectedRoute || isAdminRoute) {
    // Get the token from the request
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // Redirect to login if not authenticated
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Check admin access for admin routes
    if (isAdminRoute && token.role !== 'admin') {
      // Redirect to dashboard with error
      const dashboardUrl = new URL('/dashboard', request.url);
      dashboardUrl.searchParams.set('error', 'insufficient_permissions');
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return NextResponse.next();
}

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
