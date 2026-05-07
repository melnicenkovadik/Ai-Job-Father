export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { getServerLogger } from '@/lib/logger/server';
import { profileDraftSchema, profileToDto } from '@/lib/profile/schema';
import { SupabaseProfileRepo } from '@/lib/supabase/profile-repo';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { SupabaseUserSettingsRepo } from '@/lib/supabase/user-settings-repo';
import { requireAuth } from '@/lib/telegram/auth-middleware';
import { markOnboarded, updateProfile } from '@ai-job-bot/core';

/**
 * PUT    /api/profile/:id  → partial update. Owner-only.
 * DELETE /api/profile/:id  → remove profile. If it's the default and there
 *                            are other profiles, the oldest sibling is
 *                            auto-promoted to default first. Blocked by FK
 *                            RESTRICT when paid campaigns reference the
 *                            profile (surfaced as 409 has_campaigns).
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
      // Editing a profile is a strong signal the user is past onboarding.
      // markOnboarded is idempotent so the second call is harmless.
      await markOnboarded(user.id, {
        userSettingsRepo: new SupabaseUserSettingsRepo(),
      }).catch((err) => {
        getServerLogger().warn({ context: 'api/profile/[id].PUT.markOnboarded', error: err });
      });
      return Response.json(profileToDto(updated));
    } catch (err) {
      getServerLogger().error({
        context: 'api/profile/[id].PUT',
        data: { id },
        error: err,
      });
      return Response.json({ error: 'internal' }, { status: 500 });
    }
  })(req);
};

export const DELETE = async (
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> => {
  const { id } = await params;
  return requireAuth(async (_innerReq, { user }) => {
    const log = getServerLogger();
    const repo = new SupabaseProfileRepo(createServiceRoleClient());
    const existing = await repo.findById(id);
    if (!existing) return Response.json({ error: 'not_found' }, { status: 404 });
    if (existing.userId !== user.id.value) {
      return Response.json({ error: 'forbidden' }, { status: 403 });
    }

    // If we're deleting the default profile and the user has siblings,
    // promote the oldest sibling first (otherwise the user ends up with
    // zero defaults). The unique-default partial index allows the brief
    // "0 defaults" window between the demote+promote step.
    if (existing.isDefault) {
      const siblings = (await repo.findByUserId(user.id.value)).filter((p) => p.id.value !== id);
      if (siblings.length > 0) {
        const oldest = siblings[0];
        if (oldest === undefined) {
          // Defensive: should never happen given length check above.
          return Response.json({ error: 'internal' }, { status: 500 });
        }
        try {
          await repo.update({ id: existing.id.value, isDefault: false });
          await repo.update({ id: oldest.id.value, isDefault: true });
        } catch (err) {
          log.error({
            context: 'api/profile/[id].DELETE.promoteSibling',
            data: { id, oldestId: oldest.id.value },
            error: err,
          });
          return Response.json({ error: 'promote_failed' }, { status: 500 });
        }
      }
    }

    try {
      await repo.delete(id);
      log.info({
        context: 'api/profile/[id].DELETE',
        message: 'profile deleted',
        data: { id, userId: user.id.value, wasDefault: existing.isDefault },
      });
      return Response.json({ ok: true });
    } catch (err) {
      // Postgres FK violation on campaigns.profile_id (RESTRICT).
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code: unknown }).code)
          : '';
      if (code === '23503') {
        log.info({
          context: 'api/profile/[id].DELETE',
          message: 'blocked by FK (paid campaigns reference)',
          data: { id, userId: user.id.value },
        });
        return Response.json({ error: 'has_campaigns' }, { status: 409 });
      }
      log.error({ context: 'api/profile/[id].DELETE', data: { id }, error: err });
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
