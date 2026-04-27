import 'server-only';
import {
  CampaignEventFactory,
  type CampaignId,
  type CampaignProgressDriver,
  type NewCampaignEvent,
  type TickResult,
  UserId,
} from '@ai-job-bot/core';
import type { SupabaseCampaignRepo } from '../supabase/campaign-repo';
import type { SimulatorStateRepo, SimulatorStateRow } from './simulator-state-repo';

const CANDIDATE_POOL: readonly string[] = [
  'Klarna',
  'Notion',
  'Vercel',
  'Stripe',
  'Linear',
  'Figma',
  'Canva',
  'Datadog',
  'Mercury',
  'Ramp',
  'Anthropic',
  'Brex',
  'Cursor',
  'Anduril',
  'Rippling',
  'Posthog',
  'Doordash',
  'Zalando',
  'SumUp',
];

const PLATEAU_EVERY_TICKS = 7;
const LOCK_SECONDS = 30;

/**
 * Deterministic xorshift PRNG seeded per-campaign so reruns are reproducible.
 */
function makeRng(seed: number): () => number {
  let x = seed | 0 || 0xdeadbeef;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return ((x >>> 0) % 1_000_000) / 1_000_000;
  };
}

function pickCandidate(pool: readonly string[], rng: () => number): string {
  if (pool.length === 0) return 'Anonymous Co';
  const idx = Math.floor(rng() * pool.length);
  return pool[idx] ?? 'Anonymous Co';
}

/**
 * Simulator implementation of `CampaignProgressDriver`.
 *
 * - Acquires a row-level lock so two concurrent GETs racing into
 *   `tickCampaignIfDue` don't double-advance progress.
 * - Generates 1–5 found per tick + a smaller applied delta lagging found.
 * - Every ~7 ticks injects a 2–5 minute plateau (info event "Searching deeper…")
 *   so the demo doesn't feel like a metronome.
 * - Graduates the campaign to `completed` when applied + delta >= quota.
 */
export class SimulatorDriver implements CampaignProgressDriver {
  constructor(
    private readonly stateRepo: SimulatorStateRepo,
    private readonly campaignRepo: SupabaseCampaignRepo,
  ) {}

  async start(campaignId: CampaignId, quota: number): Promise<void> {
    await this.stateRepo.upsert({
      campaignId,
      ticksRemaining: Math.max(2, Math.ceil(quota / 2)),
      candidatePool: CANDIDATE_POOL,
      seed: Math.floor(Math.random() * 0x7fffffff),
    });
  }

  async stop(campaignId: CampaignId): Promise<void> {
    await this.stateRepo.deleteByCampaignId(campaignId);
  }

  async computeNextTick(campaignId: CampaignId, now: Date): Promise<TickResult | null> {
    let state = await this.stateRepo.findByCampaignId(campaignId);
    if (!state) {
      // Backfill: if the row is missing (e.g. payment landed before Wave F
      // shipped, or the trigger order changed), create one on the fly.
      const campaign = await this.campaignRepo.findById(campaignId);
      if (!campaign) return null;
      await this.start(campaignId, campaign.quota);
      state = await this.stateRepo.findByCampaignId(campaignId);
      if (!state) return null;
    }

    if (state.plateau_until && new Date(state.plateau_until).getTime() > now.getTime()) {
      // We're inside a plateau; emit nothing.
      return null;
    }

    const acquired = await this.stateRepo.tryAcquireLock(campaignId, LOCK_SECONDS);
    if (!acquired) {
      return null;
    }

    try {
      return await this.computeWithLock(campaignId, state, now);
    } finally {
      await this.stateRepo.releaseLock(campaignId);
    }
  }

  private async computeWithLock(
    campaignId: CampaignId,
    state: SimulatorStateRow,
    now: Date,
  ): Promise<TickResult | null> {
    const campaign = await this.campaignRepo.findById(campaignId);
    if (!campaign) return null;

    const seedNum = Number(state.seed);
    const rng = makeRng(seedNum + state.ticks_total);

    const plateauTick = (state.ticks_total + 1) % PLATEAU_EVERY_TICKS === 0;
    let plateauUntil: Date | null = null;
    const events: NewCampaignEvent[] = [];

    if (plateauTick) {
      const minutes = 2 + Math.floor(rng() * 4); // 2..5
      plateauUntil = new Date(now.getTime() + minutes * 60_000);
      events.push(
        CampaignEventFactory.info(
          campaignId,
          UserId.from(campaign.userId.value),
          'Searching deeper…',
        ),
      );
      await this.stateRepo.incrementTicks({ campaignId, plateauUntil });
      return {
        foundDelta: 0,
        appliedDelta: 0,
        events,
        nextStatus: null,
      };
    }

    const foundDelta = 1 + Math.floor(rng() * 5); // 1..5
    const appliedDeltaRaw = Math.floor(rng() * Math.max(1, foundDelta));
    const appliedDelta = Math.max(0, Math.min(appliedDeltaRaw, foundDelta));

    const pool = (state.candidate_pool ?? CANDIDATE_POOL) as readonly string[];

    if (foundDelta > 0) {
      events.push(
        CampaignEventFactory.found(
          campaignId,
          UserId.from(campaign.userId.value),
          pickCandidate(pool, rng),
          foundDelta,
        ),
      );
    }
    const appliedEvents = Math.min(appliedDelta, 3);
    for (let i = 0; i < appliedEvents; i += 1) {
      events.push(
        CampaignEventFactory.applied(
          campaignId,
          UserId.from(campaign.userId.value),
          pickCandidate(pool, rng),
        ),
      );
    }

    let nextStatus: TickResult['nextStatus'] = null;
    if (campaign.progressApplied + appliedDelta >= campaign.quota) {
      nextStatus = 'completed';
      events.push(
        CampaignEventFactory.completed(
          campaignId,
          UserId.from(campaign.userId.value),
          campaign.quota,
        ),
      );
    }

    await this.stateRepo.incrementTicks({ campaignId, plateauUntil: null });

    return { foundDelta, appliedDelta, events, nextStatus };
  }
}
