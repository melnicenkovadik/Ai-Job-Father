import 'server-only';
import type { CampaignId } from '@ai-job-bot/core';
import { type SupabaseClient, createClient } from '@supabase/supabase-js';
import { env } from '../env';

export interface SimulatorStateRow {
  campaign_id: string;
  ticks_total: number;
  ticks_remaining: number;
  plateau_until: string | null;
  candidate_pool: string[];
  seed: string | number;
  locked_until: string | null;
  created_at: string;
  updated_at: string;
}

let cached: SupabaseClient | null = null;
function client(): SupabaseClient {
  if (cached) return cached;
  cached = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    db: { schema: 'public' },
  });
  return cached;
}

export class SimulatorStateRepo {
  async findByCampaignId(campaignId: CampaignId): Promise<SimulatorStateRow | null> {
    const { data, error } = await client()
      .from('campaign_simulator_state')
      .select('*')
      .eq('campaign_id', campaignId.value)
      .maybeSingle();
    if (error) throw error;
    return (data as SimulatorStateRow | null) ?? null;
  }

  async upsert(input: {
    campaignId: CampaignId;
    ticksRemaining: number;
    candidatePool: readonly string[];
    seed: number;
  }): Promise<void> {
    const { error } = await client()
      .from('campaign_simulator_state')
      .upsert(
        {
          campaign_id: input.campaignId.value,
          ticks_remaining: input.ticksRemaining,
          candidate_pool: [...input.candidatePool],
          seed: input.seed,
        },
        { onConflict: 'campaign_id' },
      );
    if (error) throw error;
  }

  async deleteByCampaignId(campaignId: CampaignId): Promise<void> {
    const { error } = await client()
      .from('campaign_simulator_state')
      .delete()
      .eq('campaign_id', campaignId.value);
    if (error) throw error;
  }

  /**
   * Try to acquire a row-level lock for `lockSeconds`. Returns true if we
   * won; false if another process currently holds the lock. Uses an UPDATE
   * with a `locked_until` predicate so the read+write is atomic.
   */
  async tryAcquireLock(campaignId: CampaignId, lockSeconds: number): Promise<boolean> {
    const until = new Date(Date.now() + lockSeconds * 1000).toISOString();
    const { data, error } = await client()
      .from('campaign_simulator_state')
      .update({ locked_until: until })
      .eq('campaign_id', campaignId.value)
      .or(`locked_until.is.null,locked_until.lt.${new Date().toISOString()}`)
      .select('campaign_id');
    if (error) throw error;
    return Array.isArray(data) && data.length > 0;
  }

  async releaseLock(campaignId: CampaignId): Promise<void> {
    const { error } = await client()
      .from('campaign_simulator_state')
      .update({ locked_until: null })
      .eq('campaign_id', campaignId.value);
    if (error) throw error;
  }

  async incrementTicks(input: {
    campaignId: CampaignId;
    plateauUntil: Date | null;
  }): Promise<void> {
    const existing = await this.findByCampaignId(input.campaignId);
    if (!existing) return;
    const { error } = await client()
      .from('campaign_simulator_state')
      .update({
        ticks_total: existing.ticks_total + 1,
        ticks_remaining: Math.max(0, existing.ticks_remaining - 1),
        plateau_until: input.plateauUntil ? input.plateauUntil.toISOString() : null,
      })
      .eq('campaign_id', input.campaignId.value);
    if (error) throw error;
  }
}
