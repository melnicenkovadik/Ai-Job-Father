import type { Campaign, CampaignId } from '../../domain/campaign';
import type { CampaignStatus } from '../../domain/campaign-status';
import type { JobCategory } from '../../domain/job-category';
import type { PricingBreakdown } from '../../domain/pricing';
import type { UserId } from '../../domain/user';

export interface CreateCampaignDbInput {
  readonly userId: UserId;
  readonly profileId: string;
  readonly title: string;
  readonly category: JobCategory;
  readonly quota: number;
  readonly countries: readonly string[];
  readonly priceBreakdown: PricingBreakdown;
}

/**
 * CampaignRepo port — persistence boundary for the Campaign aggregate.
 * Adapter lives in `apps/web/lib/supabase/campaign-repo.ts`.
 */
export interface CampaignRepo {
  findById(id: CampaignId): Promise<Campaign | null>;
  findByUserId(userId: UserId): Promise<readonly Campaign[]>;
  create(input: CreateCampaignDbInput): Promise<Campaign>;
  /** Status flip with corresponding lifecycle timestamp. State machine is enforced upstream. */
  updateStatus(id: CampaignId, next: CampaignStatus): Promise<Campaign>;
  /** Bumps progress + last_ticked_at + last_event_at to `now`. */
  updateProgress(id: CampaignId, found: number, applied: number): Promise<Campaign>;
  /** Writes snapshot_data + schema_version. Adapter rejects when status != 'draft'. */
  freezeSnapshot(
    id: CampaignId,
    snapshot: Record<string, unknown>,
    schemaVersion: number,
  ): Promise<Campaign>;
  /**
   * Used by the simulator scanner — selects active campaigns whose
   * `last_ticked_at` is older than `since` (or null). Service-role only.
   */
  findDueForTick(since: Date, limit: number): Promise<readonly Campaign[]>;
}
