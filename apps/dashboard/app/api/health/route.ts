import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(): NextResponse {
  return NextResponse.json({
    status: 'ok',
    service: 'dashboard',
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local',
    ts: new Date().toISOString(),
  });
}
