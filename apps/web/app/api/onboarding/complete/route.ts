export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { getServerLogger } from '@/lib/logger/server';
import { withApiLogging } from '@/lib/logger/with-api-logging';
import { SupabaseUserSettingsRepo } from '@/lib/supabase/user-settings-repo';
import { requireAuth } from '@/lib/telegram/auth-middleware';
import { markOnboarded } from '@ai-job-bot/core';

/**
 * POST /api/onboarding/complete → flip has_onboarded=true.
 *
 * Idempotent: calling twice is harmless. The seed trigger guarantees the row
 * exists for any newly-created user.
 */
export const POST = withApiLogging(
  'api/onboarding/complete.POST',
  requireAuth(async (_req, { user }) => {
    const repo = new SupabaseUserSettingsRepo();
    const settings = await markOnboarded(user.id, { userSettingsRepo: repo });
    getServerLogger().info({
      context: 'api/onboarding.complete',
      message: 'onboarding marked complete',
    });
    return Response.json({ hasOnboarded: settings.hasOnboarded });
  }),
);
