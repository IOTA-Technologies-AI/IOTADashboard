import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ASPIRANTS_HOST = 'aspirants.iotatechnologies.io';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  const { pathname } = request.nextUrl;

  // Only intercept traffic arriving on the aspirants subdomain
  if (host === ASPIRANTS_HOST || host.startsWith('aspirants.')) {
    // Block any attempt to browse dashboard internals from the aspirants domain
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/auth')) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // /  →  show a clean "not found" experience (avoids leaking dashboard UI)
    if (pathname === '/') {
      return new NextResponse('Not found', { status: 404 });
    }

    // /<uuid>  →  transparently serve /candidate-intake/<uuid>
    // Already on the correct internal path — pass through
    if (pathname.startsWith('/candidate-intake/')) {
      return NextResponse.next();
    }

    // /<anything-else>  →  rewrite to /candidate-intake/<anything-else>
    const rewritten = request.nextUrl.clone();
    rewritten.pathname = `/candidate-intake${pathname}`;
    return NextResponse.rewrite(rewritten);
  }

  // dashboard.iotatechnologies.io and localhost — normal pass-through
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except Next.js internals and static assets.
     * This keeps _next/static, _next/image, favicon.ico, and public/ fast.
     */
    '/((?!_next/static|_next/image|favicon\\.ico|public/|assets/|fonts/|logo/).*)',
  ],
};
