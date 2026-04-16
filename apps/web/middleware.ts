import { type NextRequest, NextResponse } from 'next/server';

/**
 * Minimal pass-through middleware.
 * Locale resolution lives in `app/i18n/request.ts` (DB cookie → header → 'en').
 * This middleware exists so future locale-specific routing (Phase 5) can hook in.
 */
export function middleware(_req: NextRequest): NextResponse {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next|favicon.ico).*)'],
};
