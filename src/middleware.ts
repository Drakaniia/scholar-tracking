import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './lib/auth';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Define public routes that don't require authentication
  const publicPaths = ['/login', '/register', '/admin/login', '/web/login', '/web/register'];
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  // Get auth token from cookies
  const token = request.cookies.get('auth_token')?.value;

  // If user is trying to access a protected route without auth
  if (!isPublicPath && !token) {
    // Redirect to appropriate login page based on the requested path
    if (pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    } else if (pathname.startsWith('/web')) {
      return NextResponse.redirect(new URL('/web/login', request.url));
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If user is authenticated, verify token and check role
  if (token) {
    const decoded = verifyToken(token);

    if (!decoded) {
      // Invalid token, redirect to login
      if (pathname.startsWith('/admin')) {
        return NextResponse.redirect(new URL('/admin/login', request.url));
      } else if (pathname.startsWith('/web')) {
        return NextResponse.redirect(new URL('/web/login', request.url));
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const { role } = decoded;

    // Role-based access control
    if (pathname.startsWith('/admin') && role !== 'admin' && role !== 'staff') {
      // Non-admin trying to access admin routes
      if (role === 'student') {
        return NextResponse.redirect(new URL('/web/dashboard', request.url));
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }

    if (pathname.startsWith('/web') && role !== 'student') {
      // Non-student trying to access student routes
      if (role === 'admin' || role === 'staff') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Redirect authenticated users from login pages to appropriate dashboards
    if (pathname === '/login' || pathname === '/admin/login' || pathname === '/web/login') {
      if (role === 'student') {
        return NextResponse.redirect(new URL('/web/dashboard', request.url));
      } else if (role === 'admin' || role === 'staff') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      }
    }

    // Redirect root based on role
    if (pathname === '/') {
      if (role === 'student') {
        return NextResponse.redirect(new URL('/web/dashboard', request.url));
      } else if (role === 'admin' || role === 'staff') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};