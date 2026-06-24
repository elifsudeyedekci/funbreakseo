import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

const PROTECTED_PATHS = ['/dashboard', '/projects', '/billing', '/account', '/notifications', '/developer', '/support', '/affiliate'];

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PATHS.some(path => pathname.includes(path));

  if (isProtected) {
    const token = request.cookies.get('access_token')?.value ||
      request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      const locale = pathname.split('/')[1] || 'tr';
      const loginUrl = new URL(`/${locale}/giris`, request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|rss.xml|manifest.json|sw.js|icons).*)',
  ],
};