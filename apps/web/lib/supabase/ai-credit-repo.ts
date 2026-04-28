import 'server-only';
import { type SupabaseClient, createClient } from '@supabase/supabase-js';
import { env } from '../env';

export type AiCreditFeature = 'resume_parse';

let cached: SupabaseClient | null = null;
function client(): SupabaseClient {
  if (cached) return cached;
  cached = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    db: { schema: 'public' },
  });
  return cached;
}

interface GrantInput {
  userId: string;
  feature: AiCreditFeature;
  chargeId: string;
  starsAmount: number;
}

/**
 * Service-role repo for `ai_credits`. Used by:
 *   - bot's `successful_payment` handler to grant a credit
 *   - the Stars-gated AI parse endpoint to consume a credit
 *
 * `grant` is idempotent — UNIQUE(charge_id) absorbs Telegram retries.
 * `consumeOne` is single-use — second call returns false (no credit left).
 */
export class SupabaseAiCreditRepo {
  async grant(input: GrantInput): Promise<void> {
    const c = client();
    const { error } = await c.from('ai_credits').insert({
      user_id: input.userId,
      feature: input.feature,
      charge_id: input.chargeId,
      stars_amount: input.starsAmount,
    });
    // 23505 = unique_violation; means we already saw this charge_id (retry).
    if (error && error.code !== '23505') {
      throw error;
    }
  }

  async hasUnconsumed(userId: string, feature: AiCreditFeature): Promise<boolean> {
    const c = client();
    const { count, error } = await c
      .from('ai_credits')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('feature', feature)
      .is('consumed_at', null);
    if (error) throw error;
    return (count ?? 0) > 0;
  }

  /**
   * Atomically consume one credit. Returns true if consumed, false if none available.
   *
   * Implementation: select id of an unconsumed credit (LIMIT 1) → update by id with
   * `consumed_at = now() WHERE consumed_at IS NULL`. The conditional UPDATE ensures
   * two parallel consume calls can't double-spend the same row.
   */
  async consumeOne(userId: string, feature: AiCreditFeature): Promise<boolean> {
    const c = client();
    const { data: rows, error: selErr } = await c
      .from('ai_credits')
      .select('id')
      .eq('user_id', userId)
      .eq('feature', feature)
      .is('consumed_at', null)
      .order('created_at', { ascending: true })
      .limit(1);
    if (selErr) throw selErr;
    const row = (rows ?? [])[0] as { id: string } | undefined;
    if (!row) return false;

    const { data: updated, error: updErr } = await c
      .from('ai_credits')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', row.id)
      .is('consumed_at', null)
      .select('id');
    if (updErr) throw updErr;
    return (updated ?? []).length > 0;
  }
}
