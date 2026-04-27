import type { CampaignEventRepo } from '../../src/application/ports/campaign-event-repo';
import type { CampaignId } from '../../src/domain/campaign';
import {
  CampaignEvent,
  type NewCampaignEvent,
  validateNewCampaignEvent,
} from '../../src/domain/campaign-event';
import type { Clock } from '../../src/application/ports/clock';

export class FakeCampaignEventRepo implements CampaignEventRepo {
  private readonly rows: CampaignEvent[] = [];
  private seq = 0;

  constructor(private readonly clock: Clock) {}

  async insert(event: NewCampaignEvent): Promise<CampaignEvent> {
    validateNewCampaignEvent(event);
    const e = CampaignEvent.rehydrate({
      id: `ev-${++this.seq}`,
      campaignId: event.campaignId,
      userId: event.userId,
      kind: event.kind,
      text: event.text,
      data: event.data,
      createdAt: this.clock.now(),
    });
    this.rows.push(e);
    return e;
  }

  async insertMany(events: readonly NewCampaignEvent[]): Promise<readonly CampaignEvent[]> {
    const out: CampaignEvent[] = [];
    for (const e of events) out.push(await this.insert(e));
    return out;
  }

  async findByCampaignId(
    campaignId: CampaignId,
    limit: number,
  ): Promise<readonly CampaignEvent[]> {
    return this.rows
      .filter((e) => e.campaignId.equals(campaignId))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  get size(): number {
    return this.rows.length;
  }
}
