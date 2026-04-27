export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { campaignToDto } from '@/lib/campaign/schema';
import { getServerLogger } from '@/lib/logger/server';
import { SupabaseCampaignRepo } from '@/lib/supabase/campaign-repo';
import { requireAuth } from '@/lib/telegram/auth-middleware';
import { CampaignId } from '@ai-job-bot/core';

/**
 * GET /api/campaigns/:id → fetch single campaign owned by the authed user.
 * Wave F will inject lazy-tick here.
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
    try {
      const campaign = await repo.findById(cid);
      if (!campaign) {
        return Response.json({ error: 'not_found' }, { status: 404 });
      }
      if (!campaign.userId.equals(user.id)) {
        return Response.json({ error: 'forbidden' }, { status: 403 });
      }
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
