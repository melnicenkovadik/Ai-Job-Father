export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { withApiLogging } from '@/lib/logger/with-api-logging';

export const GET = withApiLogging('api/health.GET', () => {
  return Response.json({
    status: 'ok',
    service: 'ai-job-bot-web',
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local',
    ts: new Date().toISOString(),
  });
});
