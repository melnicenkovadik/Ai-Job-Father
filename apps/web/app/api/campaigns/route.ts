export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { campaignToDto, createCampaignSchema } from '@/lib/campaign/schema';
import { getServerLogger } from '@/lib/logger/server';
import { SystemClock, getCampaignProgressDriver } from '@/lib/sim/factory';
import { SupabaseCampaignEventRepo } from '@/lib/supabase/campaign-event-repo';
import { SupabaseCampaignRepo } from '@/lib/supabase/campaign-repo';
import { SupabaseProfileRepo } from '@/lib/supabase/profile-repo';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/telegram/auth-middleware';
import {
  ProfileOwnershipError,
  createCampaign,
  isActive,
  tickCampaignIfDue,
} from '@ai-job-bot/core';

const LAZY_TICK_BATCH_LIMIT = 10;

/**
 * GET  /api/campaigns → all campaigns for the authenticated user, newest first.
 * POST /api/campaigns → create a draft campaign. Server recomputes price.
 */

export const GET = requireAuth(async (_req, { user }) => {
  const repo = new SupabaseCampaignRepo();
  const eventRepo = new SupabaseCampaignEventRepo();
  try {
    let campaigns = await repo.findByUserId(user.id);

    const activeIds = campaigns
      .filter((c) => isActive(c.status))
      .slice(0, LAZY_TICK_BATCH_LIMIT)
      .map((c) => c.id);

    if (activeIds.length > 0) {
      await Promise.all(
        activeIds.map((id) =>
          tickCampaignIfDue(
            { campaignId: id },
            {
              campaignRepo: repo,
              campaignEventRepo: eventRepo,
              campaignProgressDriver: getCampaignProgressDriver(),
              clock: SystemClock,
            },
          ).catch((err) => {
            // Lazy tick must never break the list response.
            getServerLogger().warn({
              context: 'api/campaigns.list.tick',
              data: { id: id.value },
              error: err,
            });
            return null;
          }),
        ),
      );
      // Re-fetch so the response reflects the freshly-ticked progress.
      campaigns = await repo.findByUserId(user.id);
    }

    return Response.json({ campaigns: campaigns.map(campaignToDto) });
  } catch (err) {
    getServerLogger().error({ context: 'api/campaigns.list', error: err });
    return Response.json({ error: 'internal' }, { status: 500 });
  }
});

export const POST = requireAuth(async (req, { user }) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = createCampaignSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: 'validation',
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      },
      { status: 400 },
    );
  }

  const campaignRepo = new SupabaseCampaignRepo();
  const profileRepo = new SupabaseProfileRepo(createServiceRoleClient());
  try {
    const campaign = await createCampaign(
      {
        userId: user.id,
        profileId: parsed.data.profileId,
        title: parsed.data.title,
        category: parsed.data.category,
        quota: parsed.data.quota,
        countries: parsed.data.countries,
        ...(parsed.data.complexity !== undefined ? { complexity: parsed.data.complexity } : {}),
      },
      { campaignRepo, profileRepo, clock: SystemClock },
    );
    getServerLogger().info({
      context: 'api/campaigns.create',
      message: 'campaign created',
      data: {
        campaignId: campaign.id.value,
        category: campaign.category,
        quota: campaign.quota,
        priceCents: campaign.priceAmountCents,
      },
    });
    return Response.json(campaignToDto(campaign), { status: 201 });
  } catch (err) {
    if (err instanceof ProfileOwnershipError) {
      return Response.json({ error: 'profile_not_owned' }, { status: 403 });
    }
    getServerLogger().error({ context: 'api/campaigns.create', error: err });
    return Response.json({ error: 'internal' }, { status: 500 });
  }
});
