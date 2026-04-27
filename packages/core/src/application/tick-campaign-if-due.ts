import type { Campaign, CampaignId } from '../domain/campaign';
import { isActive } from '../domain/campaign-status';
import {
  type AdvanceCampaignProgressDeps,
  advanceCampaignProgress,
} from './advance-campaign-progress';

/**
 * Default tick interval — see CLAUDE.md / plan §lazy-tick. A tick fires only
 * when (a) the campaign is in an active status and (b) `last_ticked_at` is
 * older than this threshold. The driver applies its own row-level lock
 * (campaign_simulator_state.locked_until) so concurrent GETs don't double-tick.
 */
export const DEFAULT_TICK_INTERVAL_MS = 60_000;

/**
 * Convenience wrapper around `advanceCampaignProgress`. Returns the campaign
 * untouched (no tick fired) if it isn't due yet — the GET handler can call
 * this on every read without worrying about over-ticking.
 */
export async function tickCampaignIfDue(
  input: { campaignId: CampaignId; intervalMs?: number },
  deps: AdvanceCampaignProgressDeps,
): Promise<Campaign | null> {
  const campaign = await deps.campaignRepo.findById(input.campaignId);
  if (!campaign) return null;
  if (!isActive(campaign.status)) return campaign;

  const interval = input.intervalMs ?? DEFAULT_TICK_INTERVAL_MS;
  const lastTick = campaign.lastTickedAt?.getTime() ?? 0;
  const now = deps.clock.now().getTime();
  if (now - lastTick < interval) {
    return campaign;
  }

  const result = await advanceCampaignProgress({ campaignId: input.campaignId }, deps);
  return result.campaign;
}
