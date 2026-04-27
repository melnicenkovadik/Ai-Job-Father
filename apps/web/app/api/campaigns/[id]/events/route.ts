export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { eventToDto } from '@/lib/campaign/schema';
import { getServerLogger } from '@/lib/logger/server';
import { SupabaseCampaignEventRepo } from '@/lib/supabase/campaign-event-repo';
import { SupabaseCampaignRepo } from '@/lib/supabase/campaign-repo';
import { requireAuth } from '@/lib/telegram/auth-middleware';
import { CampaignId } from '@ai-job-bot/core';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/**
 * GET /api/campaigns/:id/events → timeline events, newest first.
 * Capped at MAX_LIMIT to keep payloads bounded.
 */
export const GET = async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  return requireAuth(async (rr, { user }) => {
    let cid: CampaignId;
    try {
      cid = CampaignId.from(id);
    } catch {
      return Response.json({ error: 'invalid_id' }, { status: 400 });
    }
    const url = new URL(rr.url);
    const limit = Math.min(
      Number.parseInt(url.searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT,
      MAX_LIMIT,
    );
    const campaignRepo = new SupabaseCampaignRepo();
    const eventRepo = new SupabaseCampaignEventRepo();
    try {
      const campaign = await campaignRepo.findById(cid);
      if (!campaign) {
        return Response.json({ error: 'not_found' }, { status: 404 });
      }
      if (!campaign.userId.equals(user.id)) {
        return Response.json({ error: 'forbidden' }, { status: 403 });
      }
      const events = await eventRepo.findByCampaignId(cid, limit);
      return Response.json({ events: events.map(eventToDto) });
    } catch (err) {
      getServerLogger().error({
        context: 'api/campaigns.events',
        data: { id },
        error: err,
      });
      return Response.json({ error: 'internal' }, { status: 500 });
    }
  })(req);
};
