import 'server-only';
import {
  Campaign,
  CampaignId,
  type CampaignRepo,
  type CampaignStatus,
  type CreateCampaignDbInput,
  type JobCategory,
  type PricingBreakdown,
  UserId,
  isCampaignStatus,
  isJobCategory,
} from '@ai-job-bot/core';
import { type SupabaseClient, createClient } from '@supabase/supabase-js';
import { env } from '../env';

interface CampaignRow {
  id: string;
  user_id: string;
  profile_id: string;
  title: string;
  category: string;
  status: string;
  quota: number;
  countries: string[];
  price_amount_cents: number;
  price_breakdown: Record<string, unknown> | null;
  progress_found: number;
  progress_applied: number;
  last_ticked_at: string | null;
  last_event_at: string | null;
  snapshot_data: Record<string, unknown> | null;
  snapshot_schema_version: number | null;
  paid_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
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

function rowToCampaign(row: CampaignRow): Campaign {
  if (!isCampaignStatus(row.status)) {
    throw new Error(`Invalid campaign status from DB: ${row.status}`);
  }
  if (!isJobCategory(row.category)) {
    throw new Error(`Invalid campaign category from DB: ${row.category}`);
  }
  // priceBreakdown is JSONB — adapter trusts the row was inserted with a
  // well-formed PricingBreakdown by createCampaign; if not, the cast crashes
  // here and surfaces as a 500.
  const priceBreakdown = (row.price_breakdown ?? {
    baseRateCents: 0,
    categoryMultiplier: 1,
    complexityMultiplier: 1,
    quota: row.quota,
    amountCents: row.price_amount_cents,
  }) as unknown as PricingBreakdown;

  return Campaign.rehydrate({
    id: CampaignId.from(row.id),
    userId: UserId.from(row.user_id),
    profileId: row.profile_id,
    title: row.title,
    category: row.category as JobCategory,
    status: row.status as CampaignStatus,
    quota: row.quota,
    countries: row.countries ?? [],
    priceAmountCents: row.price_amount_cents,
    priceBreakdown,
    progressFound: row.progress_found,
    progressApplied: row.progress_applied,
    lastTickedAt: row.last_ticked_at ? new Date(row.last_ticked_at) : null,
    lastEventAt: row.last_event_at ? new Date(row.last_event_at) : null,
    snapshotData: row.snapshot_data,
    snapshotSchemaVersion: row.snapshot_schema_version,
    paidAt: row.paid_at ? new Date(row.paid_at) : null,
    startedAt: row.started_at ? new Date(row.started_at) : null,
    completedAt: row.completed_at ? new Date(row.completed_at) : null,
    cancelledAt: row.cancelled_at ? new Date(row.cancelled_at) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  });
}

export class SupabaseCampaignRepo implements CampaignRepo {
  async findById(id: CampaignId): Promise<Campaign | null> {
    const { data, error } = await client()
      .from('campaigns')
      .select('*')
      .eq('id', id.value)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToCampaign(data as CampaignRow) : null;
  }

  async findByUserId(userId: UserId): Promise<readonly Campaign[]> {
    const { data, error } = await client()
      .from('campaigns')
      .select('*')
      .eq('user_id', userId.value)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return ((data as CampaignRow[] | null) ?? []).map(rowToCampaign);
  }

  async create(input: CreateCampaignDbInput): Promise<Campaign> {
    const { data, error } = await client()
      .from('campaigns')
      .insert({
        user_id: input.userId.value,
        profile_id: input.profileId,
        title: input.title,
        category: input.category,
        status: 'draft',
        quota: input.quota,
        countries: [...input.countries],
        price_amount_cents: input.priceBreakdown.amountCents,
        price_breakdown: input.priceBreakdown,
      })
      .select('*')
      .single();
    if (error) throw error;
    return rowToCampaign(data as CampaignRow);
  }

  async updateStatus(id: CampaignId, next: CampaignStatus): Promise<Campaign> {
    const updates: Record<string, unknown> = { status: next };
    if (next === 'paid') updates.paid_at = new Date().toISOString();
    if (next === 'searching') updates.started_at = new Date().toISOString();
    if (next === 'completed') updates.completed_at = new Date().toISOString();
    if (next === 'cancelled') updates.cancelled_at = new Date().toISOString();
    const { data, error } = await client()
      .from('campaigns')
      .update(updates)
      .eq('id', id.value)
      .select('*')
      .single();
    if (error) throw error;
    return rowToCampaign(data as CampaignRow);
  }

  async updateProgress(id: CampaignId, found: number, applied: number): Promise<Campaign> {
    const now = new Date().toISOString();
    const { data, error } = await client()
      .from('campaigns')
      .update({
        progress_found: found,
        progress_applied: applied,
        last_ticked_at: now,
        last_event_at: now,
      })
      .eq('id', id.value)
      .select('*')
      .single();
    if (error) throw error;
    return rowToCampaign(data as CampaignRow);
  }

  async freezeSnapshot(
    id: CampaignId,
    snapshot: Record<string, unknown>,
    schemaVersion: number,
  ): Promise<Campaign> {
    const { data, error } = await client()
      .from('campaigns')
      .update({
        snapshot_data: snapshot,
        snapshot_schema_version: schemaVersion,
      })
      .eq('id', id.value)
      .eq('status', 'draft')
      .select('*')
      .single();
    if (error) throw error;
    return rowToCampaign(data as CampaignRow);
  }

  async findDueForTick(since: Date, limit: number): Promise<readonly Campaign[]> {
    const cutoff = since.toISOString();
    const { data, error } = await client()
      .from('campaigns')
      .select('*')
      .in('status', ['searching', 'applying'])
      .or(`last_ticked_at.is.null,last_ticked_at.lt.${cutoff}`)
      .order('last_ticked_at', { ascending: true, nullsFirst: true })
      .limit(limit);
    if (error) throw error;
    return ((data as CampaignRow[] | null) ?? []).map(rowToCampaign);
  }
}
