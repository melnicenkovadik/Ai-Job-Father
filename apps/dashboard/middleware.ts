import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = new Set(['/api/health']);

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export function middleware(req: NextRequest): NextResponse {
  const path = req.nextUrl.pathname;
  if (PUBLIC_PATHS.has(path)) return NextResponse.next();

  const expectedUser = process.env.DASHBOARD_USER;
  const expectedPass = process.env.DASHBOARD_PASSWORD;

  if (!expectedUser || !expectedPass) {
    return new NextResponse('Dashboard auth not configured', { status: 503 });
  }

  const auth = req.headers.get('authorization');
  if (!auth || !auth.startsWith('Basic ')) {
    return new NextResponse('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="dashboard"' },
    });
  }

  let providedUser = '';
  let providedPass = '';
  try {
    const decoded = atob(auth.slice(6).trim());
    const idx = decoded.indexOf(':');
    if (idx === -1) throw new Error('malformed');
    providedUser = decoded.slice(0, idx);
    providedPass = decoded.slice(idx + 1);
  } catch {
    return new NextResponse('Malformed auth', { status: 400 });
  }

  if (!safeCompare(providedUser, expectedUser) || !safeCompare(providedPass, expectedPass)) {
    return new NextResponse('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="dashboard"' },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
};
