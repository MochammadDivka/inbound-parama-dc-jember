import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

const PUBLIC_PATHS = ['/login', '/admin/login', '/api/auth'];
const ADMIN_PATHS = ['/admin'];
const USER_PATHS = ['/dashboard', '/issues', '/cz'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  // Not authenticated
  if (!token) {
    const isAdminPath = pathname.startsWith('/admin');
    const loginUrl = isAdminPath ? '/admin/login' : '/login';
    return NextResponse.redirect(new URL(loginUrl, request.url));
  }

  const role = token.role as string;

  // Admin-only paths
  if (pathname.startsWith('/admin')) {
    if (role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // USER paths (also accessible by ADMIN/SPV)
  if (USER_PATHS.some((p) => pathname.startsWith(p))) {
    // All authenticated users can access
    return NextResponse.next();
  }

  // Root redirect
  if (pathname === '/') {
    if (role === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};
