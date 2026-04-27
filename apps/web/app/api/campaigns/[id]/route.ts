export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { campaignToDto } from '@/lib/campaign/schema';
import { getServerLogger } from '@/lib/logger/server';
import { SystemClock, getCampaignProgressDriver } from '@/lib/sim/factory';
import { SupabaseCampaignEventRepo } from '@/lib/supabase/campaign-event-repo';
import { SupabaseCampaignRepo } from '@/lib/supabase/campaign-repo';
import { requireAuth } from '@/lib/telegram/auth-middleware';
import { CampaignId, tickCampaignIfDue } from '@ai-job-bot/core';

/**
 * GET /api/campaigns/:id → fetch single campaign owned by the authed user.
 * Lazily advances the simulator if the campaign is active and overdue
 * (`tick-campaign-if-due` enforces the 60s minimum + row-level lock).
 */
export const GET = async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  return requireAuth(async (_r, { user }) => {
    let cid: CampaignId;
    try {
      cid = CampaignId.from(id);
    } catch {
      return Response.json({ error: 'invalid_id' }, { status: 400 });
    }
    const repo = new SupabaseCampaignRepo();
    const eventRepo = new SupabaseCampaignEventRepo();
    try {
      let campaign = await repo.findById(cid);
      if (!campaign) {
        return Response.json({ error: 'not_found' }, { status: 404 });
      }
      if (!campaign.userId.equals(user.id)) {
        return Response.json({ error: 'forbidden' }, { status: 403 });
      }

      const ticked = await tickCampaignIfDue(
        { campaignId: cid },
        {
          campaignRepo: repo,
          campaignEventRepo: eventRepo,
          campaignProgressDriver: getCampaignProgressDriver(),
          clock: SystemClock,
        },
      );
      if (ticked) campaign = ticked;

      return Response.json(campaignToDto(campaign));
    } catch (err) {
      getServerLogger().error({
        context: 'api/campaigns.get',
        data: { id },
        error: err,
      });
      return Response.json({ error: 'internal' }, { status: 500 });
    }
  })(req);
};
