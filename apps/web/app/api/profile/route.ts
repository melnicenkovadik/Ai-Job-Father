export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { getServerLogger } from '@/lib/logger/server';
import { profileDraftSchema, profileToDto } from '@/lib/profile/schema';
import { SupabaseProfileRepo } from '@/lib/supabase/profile-repo';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { SupabaseUserSettingsRepo } from '@/lib/supabase/user-settings-repo';
import { requireAuth } from '@/lib/telegram/auth-middleware';
import { createProfile, markOnboarded } from '@ai-job-bot/core';

/**
 * GET  /api/profile   → default profile for the authed user, or `null`.
 * POST /api/profile   → create the default profile.
 *
 * Phase 2 ships only the default-profile flow. Multi-profile list lands
 * when the wizard (Phase 3) needs alternate profiles.
 */

export const GET = requireAuth(async (_req, { user }) => {
  const repo = new SupabaseProfileRepo(createServiceRoleClient());
  const profile = await repo.findDefault(user.id.value);
  return Response.json(profile ? profileToDto(profile) : null);
});

export const POST = requireAuth(async (req, { user }) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = profileDraftSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'validation', issues: parsed.error.issues.map(issueToDto) },
      { status: 400 },
    );
  }

  const repo = new SupabaseProfileRepo(createServiceRoleClient());
  try {
    const profile = await createProfile(
      {
        userId: user.id.value,
        isDefault: true,
        ...parsed.data,
      },
      { profileRepo: repo },
    );
    // Creating a profile implies the user has completed onboarding. Without
    // this, the home page may bounce them back to /onboarding because
    // settings.hasOnboarded only flipped if they clicked the welcome CTA.
    await markOnboarded(user.id, { userSettingsRepo: new SupabaseUserSettingsRepo() }).catch(
      (err) => {
        getServerLogger().warn({ context: 'api/profile.POST.markOnboarded', error: err });
      },
    );
    return Response.json(profileToDto(profile), { status: 201 });
  } catch (err) {
    getServerLogger().error({ context: 'api/profile.POST', error: err });
    return Response.json({ error: 'internal' }, { status: 500 });
  }
});

function issueToDto(issue: { path: (string | number)[]; message: string }): {
  path: string;
  message: string;
} {
  return { path: issue.path.join('.'), message: issue.message };
}
