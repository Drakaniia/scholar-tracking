import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-key'
);

async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload.user as Record<string, unknown>;
  } catch {
    return null;
  }
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/api/auth/login'];
  
  // Create response
  let response: NextResponse;
  
  if (publicRoutes.includes(pathname)) {
    response = NextResponse.next();
  } else {
    // Check for authentication token
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Verify token
    const user = await verifyToken(token);
    
    if (!user) {
      // Invalid token, redirect to login
      response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('auth-token');
      return response;
    }

    // Add user info to request headers for API routes
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', String((user as Record<string, unknown>).id));
    requestHeaders.set('x-user-role', String((user as Record<string, unknown>).role));
    requestHeaders.set('x-user-username', String((user as Record<string, unknown>).username));

    response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Add compression hint
  if (!response.headers.has('Content-Encoding')) {
    response.headers.set('Accept-Encoding', 'gzip, deflate, br');
  }

  // Add cache headers for static assets
  if (pathname.startsWith('/_next/static/') || pathname.startsWith('/assets/')) {
    response.headers.set(
      'Cache-Control',
      'public, max-age=31536000, immutable'
    );
  }

  // Add cache headers for images
  if (pathname.match(/\.(jpg|jpeg|png|gif|webp|avif|svg|ico)$/)) {
    response.headers.set(
      'Cache-Control',
      'public, max-age=2592000, stale-while-revalidate=86400'
    );
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public|logo.ico).*)',
  ],
};