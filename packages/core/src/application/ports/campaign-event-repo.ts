import type { CampaignEvent, NewCampaignEvent } from '../../domain/campaign-event';
import type { CampaignId } from '../../domain/campaign';

/**
 * CampaignEventRepo — append-only writes + paged reads.
 */
export interface CampaignEventRepo {
  insert(event: NewCampaignEvent): Promise<CampaignEvent>;
  insertMany(events: readonly NewCampaignEvent[]): Promise<readonly CampaignEvent[]>;
  findByCampaignId(campaignId: CampaignId, limit: number): Promise<readonly CampaignEvent[]>;
}
