import { type Campaign, type CampaignId } from '../domain/campaign';
import { canTransition } from '../domain/campaign-status';
import { DomainError } from '../domain/user';
import type { Clock } from './ports/clock';
import type { CampaignEventRepo } from './ports/campaign-event-repo';
import type {
  CampaignProgressDriver,
  TickResult,
} from './ports/campaign-progress-driver';
import type { CampaignRepo } from './ports/campaign-repo';

export class CampaignNotAdvanceableError extends DomainError {
  constructor(id: string, status: string) {
    super(`Campaign ${id} cannot advance from status=${status}`);
  }
}

export interface AdvanceCampaignProgressDeps {
  readonly campaignRepo: CampaignRepo;
  readonly campaignEventRepo: CampaignEventRepo;
  readonly campaignProgressDriver: CampaignProgressDriver;
  readonly clock: Clock;
}

export interface AdvanceCampaignProgressResult {
  readonly campaign: Campaign;
  readonly tick: TickResult | null;
}

/**
 * Pull one tick from the driver and write the deltas + events. Idempotent
 * when the driver returns `null` (no-op). State machine is enforced — an
 * illegal `nextStatus` from the driver is dropped and the campaign keeps
 * its current status while the progress fields still update.
 */
export async function advanceCampaignProgress(
  input: { campaignId: CampaignId },
  deps: AdvanceCampaignProgressDeps,
): Promise<AdvanceCampaignProgressResult> {
  const campaign = await deps.campaignRepo.findById(input.campaignId);
  if (!campaign) {
    throw new CampaignNotAdvanceableError(input.campaignId.value, 'not_found');
  }
  if (campaign.status !== 'searching' && campaign.status !== 'applying') {
    return { campaign, tick: null };
  }

  const tick = await deps.campaignProgressDriver.computeNextTick(
    input.campaignId,
    deps.clock.now(),
  );
  if (!tick) {
    return { campaign, tick: null };
  }

  const newFound = campaign.progressFound + tick.foundDelta;
  const newApplied = Math.min(
    campaign.progressApplied + tick.appliedDelta,
    campaign.quota,
  );

  const updatedProgress = await deps.campaignRepo.updateProgress(
    input.campaignId,
    newFound,
    newApplied,
  );

  if (tick.events.length > 0) {
    await deps.campaignEventRepo.insertMany(tick.events);
  }

  let updated = updatedProgress;
  if (tick.nextStatus && canTransition(updated.status, tick.nextStatus)) {
    updated = await deps.campaignRepo.updateStatus(input.campaignId, tick.nextStatus);
  }

  return { campaign: updated, tick };
}
