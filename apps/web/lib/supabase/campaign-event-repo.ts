import 'server-only';
import {
  CampaignEvent,
  type CampaignEventKind,
  type CampaignEventRepo,
  CampaignId,
  type NewCampaignEvent,
  UserId,
  isCampaignEventKind,
  validateNewCampaignEvent,
} from '@ai-job-bot/core';
import { type SupabaseClient, createClient } from '@supabase/supabase-js';
import { env } from '../env';

interface CampaignEventRow {
  id: string;
  campaign_id: string;
  user_id: string;
  kind: string;
  text: string;
  data: Record<string, unknown> | null;
  created_at: string;
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

function rowToEvent(row: CampaignEventRow): CampaignEvent {
  if (!isCampaignEventKind(row.kind)) {
    throw new Error(`Invalid campaign event kind from DB: ${row.kind}`);
  }
  return CampaignEvent.rehydrate({
    id: row.id,
    campaignId: CampaignId.from(row.campaign_id),
    userId: UserId.from(row.user_id),
    kind: row.kind as CampaignEventKind,
    text: row.text,
    data: row.data ?? undefined,
    createdAt: new Date(row.created_at),
  });
}

function eventToInsertRow(event: NewCampaignEvent): Record<string, unknown> {
  validateNewCampaignEvent(event);
  return {
    campaign_id: event.campaignId.value,
    user_id: event.userId.value,
    kind: event.kind,
    text: event.text,
    data: event.data ?? null,
  };
}

export class SupabaseCampaignEventRepo implements CampaignEventRepo {
  async insert(event: NewCampaignEvent): Promise<CampaignEvent> {
    const { data, error } = await client()
      .from('campaign_events')
      .insert(eventToInsertRow(event))
      .select('*')
      .single();
    if (error) throw error;
    return rowToEvent(data as CampaignEventRow);
  }

  async insertMany(events: readonly NewCampaignEvent[]): Promise<readonly CampaignEvent[]> {
    if (events.length === 0) return [];
    const rows = events.map(eventToInsertRow);
    const { data, error } = await client().from('campaign_events').insert(rows).select('*');
    if (error) throw error;
    return ((data as CampaignEventRow[] | null) ?? []).map(rowToEvent);
  }

  async findByCampaignId(campaignId: CampaignId, limit: number): Promise<readonly CampaignEvent[]> {
    const { data, error } = await client()
      .from('campaign_events')
      .select('*')
      .eq('campaign_id', campaignId.value)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return ((data as CampaignEventRow[] | null) ?? []).map(rowToEvent);
  }
}
