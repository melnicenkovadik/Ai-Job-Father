import 'server-only';
import { getServiceClient } from './supabase';
import type { CampaignRow, LogRow, PaymentRow } from './types';

export type OverviewData = {
  users: number;
  activeCampaigns: number;
  paidCampaigns: number;
  starsRevenue: number;
  tonRevenue: number;
  errors24h: number;
  recentCampaigns: Pick<
    CampaignRow,
    'id' | 'title' | 'status' | 'category' | 'price_amount_cents' | 'created_at' | 'user_id'
  >[];
  recentPayments: Pick<
    PaymentRow,
    | 'id'
    | 'provider'
    | 'status'
    | 'amount_provider'
    | 'currency'
    | 'created_at'
    | 'user_id'
    | 'campaign_id'
  >[];
  recentErrors: Pick<LogRow, 'id' | 'level' | 'context' | 'message' | 'created_at'>[];
};

export async function getOverview(): Promise<OverviewData> {
  const supabase = getServiceClient();
  const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  const [
    usersResult,
    activeCampaignsResult,
    paidCampaignsResult,
    starsRevenueResult,
    tonRevenueResult,
    errors24hResult,
    recentCampaignsResult,
    recentPaymentsResult,
    recentErrorsResult,
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .in('status', ['searching', 'applying']),
    supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .not('paid_at', 'is', null),
    supabase
      .from('payments')
      .select('amount_provider')
      .eq('provider', 'stars')
      .eq('status', 'succeeded'),
    supabase
      .from('payments')
      .select('amount_provider')
      .eq('provider', 'ton')
      .eq('status', 'succeeded'),
    supabase
      .from('app_logs')
      .select('*', { count: 'exact', head: true })
      .eq('level', 'error')
      .gte('created_at', since24h),
    supabase
      .from('campaigns')
      .select('id, title, status, category, price_amount_cents, created_at, user_id')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('payments')
      .select('id, provider, status, amount_provider, currency, created_at, user_id, campaign_id')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('app_logs')
      .select('id, level, context, message, created_at')
      .eq('level', 'error')
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const starsRows = (starsRevenueResult.data ?? []) as { amount_provider: number | string }[];
  const tonRows = (tonRevenueResult.data ?? []) as { amount_provider: number | string }[];

  const starsRevenue = starsRows.reduce((sum, p) => sum + Number(p.amount_provider ?? 0), 0);
  const tonRevenue = tonRows.reduce((sum, p) => sum + Number(p.amount_provider ?? 0), 0);

  return {
    users: usersResult.count ?? 0,
    activeCampaigns: activeCampaignsResult.count ?? 0,
    paidCampaigns: paidCampaignsResult.count ?? 0,
    starsRevenue,
    tonRevenue,
    errors24h: errors24hResult.count ?? 0,
    recentCampaigns: (recentCampaignsResult.data ?? []) as OverviewData['recentCampaigns'],
    recentPayments: (recentPaymentsResult.data ?? []) as OverviewData['recentPayments'],
    recentErrors: (recentErrorsResult.data ?? []) as OverviewData['recentErrors'],
  };
}
