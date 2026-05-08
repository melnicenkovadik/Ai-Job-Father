export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { getServerLogger } from '@/lib/logger/server';
import { withApiLogging } from '@/lib/logger/with-api-logging';
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

export const PUT = withApiLogging(
  'api/profile/[id].PUT',
  async (req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> => {
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

      const updated = await updateProfile({ id, ...parsed.data }, { profileRepo: repo });
      // Editing a profile is a strong signal the user is past onboarding.
      // markOnboarded is idempotent so the second call is harmless.
      await markOnboarded(user.id, {
        userSettingsRepo: new SupabaseUserSettingsRepo(),
      }).catch((err) => {
        getServerLogger().warn({ context: 'api/profile/[id].PUT.markOnboarded', error: err });
      });
      return Response.json(profileToDto(updated));
    })(req);
  },
);

export const DELETE = withApiLogging(
  'api/profile/[id].DELETE',
  async (req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> => {
    const { id } = await params;
    // `?force=1` opts in to cascading delete: campaigns, their payments
    // (and CASCADE-bound `campaign_events` + `campaign_simulator_state`).
    // Without the flag the route blocks on FK 23503 (paid campaigns).
    const url = new URL(req.url);
    const force = url.searchParams.get('force') === '1';
    return requireAuth(async (_innerReq, { user }) => {
      const log = getServerLogger();
      const supabase = createServiceRoleClient();
      const repo = new SupabaseProfileRepo(supabase);
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

      if (force) {
        // Cascade: payments → campaigns → profile.
        // payments.campaign_id is RESTRICT, so we must drop payments before
        // their campaigns. campaign_events / campaign_simulator_state are
        // CASCADE-bound and disappear with their parent campaign.
        // The generated `Database` types are missing `campaigns` / `payments`
        // (Docker-bound `db:gen-types` is deferred); cast through `unknown`
        // to a permissive shape so this query works against the live DB.
        // biome-ignore lint/suspicious/noExplicitAny: typed client lags schema, see comment
        const raw = supabase as unknown as any;
        try {
          const { data: campaigns, error: cErr } = await raw
            .from('campaigns')
            .select('id')
            .eq('profile_id', id);
          if (cErr) throw cErr;
          const campaignIds = ((campaigns ?? []) as { id: string }[]).map((c) => c.id);
          let paymentsDeleted = 0;
          if (campaignIds.length > 0) {
            const { error: pErr, count } = await raw
              .from('payments')
              .delete({ count: 'exact' })
              .in('campaign_id', campaignIds);
            if (pErr) throw pErr;
            paymentsDeleted = (count as number | null) ?? 0;
            const { error: rmErr } = await raw.from('campaigns').delete().eq('profile_id', id);
            if (rmErr) throw rmErr;
          }
          await repo.delete(id);
          log.info({
            context: 'api/profile/[id].DELETE',
            message: 'profile cascade-deleted',
            data: {
              id,
              userId: user.id.value,
              campaignsDeleted: campaignIds.length,
              paymentsDeleted,
            },
          });
          return Response.json({
            ok: true,
            cascaded: { campaigns: campaignIds.length, payments: paymentsDeleted },
          });
        } catch (err) {
          log.error({
            context: 'api/profile/[id].DELETE.cascade',
            data: { id, userId: user.id.value },
            error: err,
          });
          return Response.json({ error: 'cascade_failed' }, { status: 500 });
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
          // Count what blocks the delete so the client can show
          // "delete N campaigns + M payments?" in the second-stage confirm.
          // biome-ignore lint/suspicious/noExplicitAny: typed client lags schema
          const raw = supabase as unknown as any;
          const { count: campaignCount } = await raw
            .from('campaigns')
            .select('*', { count: 'exact', head: true })
            .eq('profile_id', id);
          log.info({
            context: 'api/profile/[id].DELETE',
            message: 'blocked by FK (paid campaigns reference)',
            data: { id, userId: user.id.value, campaignCount },
          });
          return Response.json(
            { error: 'has_campaigns', campaignCount: campaignCount ?? 0 },
            { status: 409 },
          );
        }
        throw err;
      }
    })(req);
  },
);

function issueToDto(issue: { path: (string | number)[]; message: string }): {
  path: string;
  message: string;
} {
  return { path: issue.path.join('.'), message: issue.message };
}
