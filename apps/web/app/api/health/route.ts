export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json({
    status: 'ok',
    service: 'ai-job-bot-web',
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local',
    ts: new Date().toISOString(),
  });
}
