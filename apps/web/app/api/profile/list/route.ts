export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { env } from '@/lib/env';
import { getServerLogger } from '@/lib/logger/server';
import { profileToDto } from '@/lib/profile/schema';
import { SupabaseProfileRepo } from '@/lib/supabase/profile-repo';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/telegram/auth-middleware';
import { type SupabaseClient, createClient } from '@supabase/supabase-js';

let countsClient: SupabaseClient | null = null;
function getCountsClient(): SupabaseClient {
  if (countsClient) return countsClient;
  countsClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    db: { schema: 'public' },
  });
  return countsClient;
}

interface ProfileWithCount {
  profile: ReturnType<typeof profileToDto>;
  campaignCount: number;
}

/**
 * GET /api/profile/list → all profiles for the authed user, plus the number
 * of campaigns referencing each one. Used by the profiles list screen.
 */
export const GET = requireAuth(async (_req, { user }) => {
  const profileRepo = new SupabaseProfileRepo(createServiceRoleClient());
  try {
    const profiles = await profileRepo.findByUserId(user.id.value);
    if (profiles.length === 0) {
      return Response.json({ profiles: [] });
    }

    const { data: campaignRows, error } = await getCountsClient()
      .from('campaigns')
      .select('profile_id')
      .eq('user_id', user.id.value);
    if (error) throw error;

    const counts = new Map<string, number>();
    for (const row of (campaignRows as { profile_id: string }[] | null) ?? []) {
      counts.set(row.profile_id, (counts.get(row.profile_id) ?? 0) + 1);
    }

    const result: ProfileWithCount[] = profiles.map((p) => ({
      profile: profileToDto(p),
      campaignCount: counts.get(p.id.value) ?? 0,
    }));
    return Response.json({ profiles: result });
  } catch (err) {
    getServerLogger().error({ context: 'api/profile.list', error: err });
    return Response.json({ error: 'internal' }, { status: 500 });
  }
});
