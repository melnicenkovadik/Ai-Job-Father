export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { campaignToDto } from '@/lib/campaign/schema';
import { getServerLogger } from '@/lib/logger/server';
import { SupabaseCampaignRepo } from '@/lib/supabase/campaign-repo';
import { requireAuth } from '@/lib/telegram/auth-middleware';
import {
  CampaignId,
  CampaignNotFoundError,
  CampaignOwnershipError,
  InvalidStatusTransitionError,
  cancelCampaign,
} from '@ai-job-bot/core';

/**
 * POST /api/campaigns/:id/cancel → flip a non-terminal campaign to 'cancelled'.
 */
export const POST = async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
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
      const updated = await cancelCampaign({ id: cid, userId: user.id }, { campaignRepo: repo });
      getServerLogger().info({
        context: 'api/campaigns.cancel',
        message: 'campaign cancelled',
        data: { id: cid.value },
      });
      return Response.json(campaignToDto(updated));
    } catch (err) {
      if (err instanceof CampaignNotFoundError) {
        return Response.json({ error: 'not_found' }, { status: 404 });
      }
      if (err instanceof CampaignOwnershipError) {
        return Response.json({ error: 'forbidden' }, { status: 403 });
      }
      if (err instanceof InvalidStatusTransitionError) {
        return Response.json({ error: 'invalid_transition' }, { status: 409 });
      }
      getServerLogger().error({
        context: 'api/campaigns.cancel',
        data: { id },
        error: err,
      });
      return Response.json({ error: 'internal' }, { status: 500 });
    }
  })(req);
};
