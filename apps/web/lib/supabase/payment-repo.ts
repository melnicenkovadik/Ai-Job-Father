import 'server-only';
import {
  CampaignId,
  Payment,
  type PaymentCurrency,
  type PaymentProvider,
  type PaymentRepo,
  type PaymentStatus,
  type RecordPaymentDbInput,
  UserId,
  isPaymentCurrency,
  isPaymentProvider,
  isPaymentStatus,
} from '@ai-job-bot/core';
import { type SupabaseClient, createClient } from '@supabase/supabase-js';
import { env } from '../env';

interface PaymentRow {
  id: string;
  user_id: string;
  campaign_id: string;
  provider: string;
  provider_charge_id: string;
  status: string;
  amount_cents: number;
  amount_provider: string | number;
  currency: string;
  snapshot_data: Record<string, unknown>;
  snapshot_hash: string;
  nonce: string;
  raw_event: Record<string, unknown> | null;
  created_at: string;
  confirmed_at: string | null;
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

function rowToPayment(row: PaymentRow): Payment {
  if (!isPaymentProvider(row.provider)) {
    throw new Error(`Invalid payment provider from DB: ${row.provider}`);
  }
  if (!isPaymentStatus(row.status)) {
    throw new Error(`Invalid payment status from DB: ${row.status}`);
  }
  if (!isPaymentCurrency(row.currency)) {
    throw new Error(`Invalid payment currency from DB: ${row.currency}`);
  }
  return Payment.rehydrate({
    id: row.id,
    userId: UserId.from(row.user_id),
    campaignId: CampaignId.from(row.campaign_id),
    provider: row.provider as PaymentProvider,
    providerChargeId: row.provider_charge_id,
    status: row.status as PaymentStatus,
    amountCents: row.amount_cents,
    amountProvider:
      typeof row.amount_provider === 'string'
        ? Number.parseFloat(row.amount_provider)
        : row.amount_provider,
    currency: row.currency as PaymentCurrency,
    snapshotData: row.snapshot_data,
    snapshotHash: row.snapshot_hash,
    nonce: row.nonce,
    rawEvent: row.raw_event,
    createdAt: new Date(row.created_at),
    confirmedAt: row.confirmed_at ? new Date(row.confirmed_at) : null,
  });
}

export class SupabasePaymentRepo implements PaymentRepo {
  async findByProviderCharge(
    provider: PaymentProvider,
    providerChargeId: string,
  ): Promise<Payment | null> {
    const { data, error } = await client()
      .from('payments')
      .select('*')
      .eq('provider', provider)
      .eq('provider_charge_id', providerChargeId)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToPayment(data as PaymentRow) : null;
  }

  async findByCampaignId(campaignId: CampaignId): Promise<readonly Payment[]> {
    const { data, error } = await client()
      .from('payments')
      .select('*')
      .eq('campaign_id', campaignId.value)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return ((data as PaymentRow[] | null) ?? []).map(rowToPayment);
  }

  async recordSucceeded(input: RecordPaymentDbInput): Promise<Payment> {
    return this.upsert(input, 'succeeded');
  }

  async recordFailed(input: RecordPaymentDbInput): Promise<Payment> {
    return this.upsert(input, 'failed');
  }

  /**
   * Idempotent on (provider, provider_charge_id) UNIQUE — a duplicate insert
   * (e.g. Telegram retrying the successful_payment update on our 5xx) hits
   * the conflict and we return the existing row instead of raising.
   */
  private async upsert(
    input: RecordPaymentDbInput,
    finalStatus: 'succeeded' | 'failed',
  ): Promise<Payment> {
    const insertRow = {
      user_id: input.userId.value,
      campaign_id: input.campaignId.value,
      provider: input.provider,
      provider_charge_id: input.providerChargeId,
      status: finalStatus,
      amount_cents: input.amountCents,
      amount_provider: input.amountProvider,
      currency: input.currency,
      snapshot_data: input.snapshotData,
      snapshot_hash: input.snapshotHash,
      nonce: input.nonce,
      raw_event: input.rawEvent ?? null,
      confirmed_at: finalStatus === 'succeeded' ? new Date().toISOString() : null,
    };

    const { data, error } = await client().from('payments').insert(insertRow).select('*').single();

    if (error) {
      // 23505 = unique violation — fetch the existing row and return it.
      const code = (error as { code?: string }).code;
      if (code === '23505') {
        const existing = await this.findByProviderCharge(input.provider, input.providerChargeId);
        if (existing) return existing;
      }
      throw error;
    }
    return rowToPayment(data as PaymentRow);
  }
}
