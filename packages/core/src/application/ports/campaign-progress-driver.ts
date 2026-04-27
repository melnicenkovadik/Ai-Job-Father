import type { CampaignId } from '../../domain/campaign';
import type { CampaignStatus } from '../../domain/campaign-status';
import type { NewCampaignEvent } from '../../domain/campaign-event';

/**
 * Per-tick result returned by a CampaignProgressDriver. The use case
 * `advanceCampaignProgress` validates the proposed `nextStatus` against the
 * state machine and writes via the campaign repos — drivers themselves
 * never touch the database.
 *
 * `nextStatus = null` means: leave the status as-is (most ticks).
 */
export interface TickResult {
  readonly foundDelta: number;
  readonly appliedDelta: number;
  readonly events: readonly NewCampaignEvent[];
  readonly nextStatus: CampaignStatus | null;
}

/**
 * THE seam between the simulator (today) and the real downstream scraper
 * (later). Three operations:
 *
 * - `start` is invoked from `recordPayment` once a campaign flips to
 *   `searching`. The driver provisions whatever it needs to begin producing
 *   ticks (the simulator inserts a `campaign_simulator_state` row; the real
 *   driver enqueues a worker job).
 * - `stop` releases driver state — used when a campaign is cancelled.
 * - `computeNextTick` is the per-tick query. Returns `null` if the driver
 *   has nothing to add for this campaign right now (e.g. plateau, lock
 *   contention, no new candidates).
 */
export interface CampaignProgressDriver {
  start(campaignId: CampaignId, quota: number): Promise<void>;
  stop(campaignId: CampaignId): Promise<void>;
  computeNextTick(campaignId: CampaignId, now: Date): Promise<TickResult | null>;
}
