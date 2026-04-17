export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { profileDraftSchema, profileToDto } from '@/lib/profile/schema';
import { SupabaseProfileRepo } from '@/lib/supabase/profile-repo';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/telegram/auth-middleware';
import { updateProfile } from '@ai-job-bot/core';

/**
 * PUT /api/profile/:id   → partial update. Owner-only (checked via user_id).
 */

export const PUT = async (
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> => {
  const { id } = await params;
  return requireAuth(async (innerReq, { user }) => {
    let body: unknown;
    try {
      body = await innerReq.json();
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
    const existing = await repo.findById(id);
    if (!existing) return Response.json({ error: 'not_found' }, { status: 404 });
    if (existing.userId !== user.id.value) {
      return Response.json({ error: 'forbidden' }, { status: 403 });
    }

    try {
      const updated = await updateProfile({ id, ...parsed.data }, { profileRepo: repo });
      return Response.json(profileToDto(updated));
    } catch (err) {
      console.error('PUT /api/profile/:id', err);
      return Response.json({ error: 'internal' }, { status: 500 });
    }
  })(req);
};

function issueToDto(issue: { path: (string | number)[]; message: string }): {
  path: string;
  message: string;
} {
  return { path: issue.path.join('.'), message: issue.message };
}
