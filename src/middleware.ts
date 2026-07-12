import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const VALID_ADMIN_ROLES = new Set(['true', 'full', 'newsletter']);

export function middleware(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get('admin_auth');

  if (cookie?.value && VALID_ADMIN_ROLES.has(cookie.value)) {
    return NextResponse.next();
  }

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.searchParams.set('redirect', req.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/admin/:path*'],
};
