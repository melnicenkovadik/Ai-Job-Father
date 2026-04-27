import type { Clock } from '../../src/application/ports/clock';
import type {
  CampaignRepo,
  CreateCampaignDbInput,
} from '../../src/application/ports/campaign-repo';
import { Campaign, CampaignId } from '../../src/domain/campaign';
import type { CampaignStatus } from '../../src/domain/campaign-status';
import type { UserId } from '../../src/domain/user';

export class FakeCampaignRepo implements CampaignRepo {
  private readonly rows = new Map<string, Campaign>();
  private seq = 0;

  constructor(private readonly clock: Clock) {}

  async findById(id: CampaignId): Promise<Campaign | null> {
    return this.rows.get(id.value) ?? null;
  }

  async findByUserId(userId: UserId): Promise<readonly Campaign[]> {
    return [...this.rows.values()].filter((c) => c.userId.equals(userId));
  }

  async create(input: CreateCampaignDbInput): Promise<Campaign> {
    const id = CampaignId.from(`c-${++this.seq}`);
    const c = Campaign.create({
      id,
      userId: input.userId,
      profileId: input.profileId,
      title: input.title,
      category: input.category,
      quota: input.quota,
      countries: input.countries,
      priceBreakdown: input.priceBreakdown,
      now: this.clock.now(),
    });
    this.rows.set(id.value, c);
    return c;
  }

  async updateStatus(id: CampaignId, next: CampaignStatus): Promise<Campaign> {
    const existing = this.rows.get(id.value);
    if (!existing) throw new Error(`campaign not found: ${id.value}`);
    const updated = existing.withStatus(next, this.clock.now());
    this.rows.set(id.value, updated);
    return updated;
  }

  async updateProgress(id: CampaignId, found: number, applied: number): Promise<Campaign> {
    const existing = this.rows.get(id.value);
    if (!existing) throw new Error(`campaign not found: ${id.value}`);
    const updated = existing.withProgress(found, applied, this.clock.now());
    this.rows.set(id.value, updated);
    return updated;
  }

  async freezeSnapshot(
    id: CampaignId,
    snapshot: Record<string, unknown>,
    schemaVersion: number,
  ): Promise<Campaign> {
    const existing = this.rows.get(id.value);
    if (!existing) throw new Error(`campaign not found: ${id.value}`);
    const updated = existing.withSnapshot(snapshot, schemaVersion, this.clock.now());
    this.rows.set(id.value, updated);
    return updated;
  }

  async findDueForTick(_since: Date, _limit: number): Promise<readonly Campaign[]> {
    return [];
  }

  get size(): number {
    return this.rows.size;
  }
}
