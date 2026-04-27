import type {
  CampaignProgressDriver,
  TickResult,
} from '../../src/application/ports/campaign-progress-driver';
import type { CampaignId } from '../../src/domain/campaign';

/**
 * Test double that returns scripted tick results for use-case tests.
 * Use `enqueue(...)` to push expected ticks; the driver returns them in
 * order on subsequent `computeNextTick` calls. Returns `null` when the
 * queue is empty.
 */
export class FakeProgressDriver implements CampaignProgressDriver {
  private readonly started = new Set<string>();
  private readonly queue: TickResult[] = [];

  enqueue(tick: TickResult): void {
    this.queue.push(tick);
  }

  async start(campaignId: CampaignId): Promise<void> {
    this.started.add(campaignId.value);
  }

  async stop(campaignId: CampaignId): Promise<void> {
    this.started.delete(campaignId.value);
  }

  async computeNextTick(): Promise<TickResult | null> {
    return this.queue.shift() ?? null;
  }

  isStarted(campaignId: CampaignId): boolean {
    return this.started.has(campaignId.value);
  }
}
