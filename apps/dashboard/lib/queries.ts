import 'server-only';
import { getServiceClient } from './supabase';
import type { CampaignRow, LogRow, PaymentRow, UserRow } from './types';

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

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export type UserListItem = Pick<
  UserRow,
  'id' | 'telegram_id' | 'username' | 'first_name' | 'last_name' | 'locale' | 'created_at'
> & {
  campaign_count: number;
  payment_count: number;
};

export async function getUsersList(
  page: number,
  limit = 20,
): Promise<{ rows: UserListItem[]; total: number }> {
  const supabase = getServiceClient();
  const offset = (page - 1) * limit;

  const [usersResult, countsResult] = await Promise.all([
    supabase
      .from('users')
      .select('id, telegram_id, username, first_name, last_name, locale, created_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1),
    supabase.from('users').select('*', { count: 'exact', head: true }),
  ]);

  const users = (usersResult.data ?? []) as Pick<
    UserRow,
    'id' | 'telegram_id' | 'username' | 'first_name' | 'last_name' | 'locale' | 'created_at'
  >[];

  if (users.length === 0) {
    return { rows: [], total: countsResult.count ?? 0 };
  }

  const userIds = users.map((u) => u.id);

  const [campaignCountsResult, paymentCountsResult] = await Promise.all([
    supabase.from('campaigns').select('user_id').in('user_id', userIds),
    supabase.from('payments').select('user_id').in('user_id', userIds),
  ]);

  const campaignCounts: Record<string, number> = {};
  const paymentCounts: Record<string, number> = {};

  for (const c of (campaignCountsResult.data ?? []) as { user_id: string }[]) {
    campaignCounts[c.user_id] = (campaignCounts[c.user_id] ?? 0) + 1;
  }
  for (const p of (paymentCountsResult.data ?? []) as { user_id: string }[]) {
    paymentCounts[p.user_id] = (paymentCounts[p.user_id] ?? 0) + 1;
  }

  const rows: UserListItem[] = users.map((u) => ({
    ...u,
    campaign_count: campaignCounts[u.id] ?? 0,
    payment_count: paymentCounts[u.id] ?? 0,
  }));

  return { rows, total: countsResult.count ?? 0 };
}

export type ProfileRow = {
  id: string;
  user_id: string;
  name: string;
  is_default: boolean;
  full_name: string | null;
  email: string | null;
  headline: string | null;
  years_total: number | null;
  skills: unknown;
  resume_storage_path: string | null;
  resume_parsed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type UserSettingsRow = {
  id: string;
  user_id: string;
  locale: string;
  notify_push: boolean;
  notify_email: boolean;
  notify_weekly: boolean;
  has_onboarded: boolean;
};

export type UserDetail = {
  user: UserRow;
  profiles: ProfileRow[];
  campaigns: Pick<
    CampaignRow,
    'id' | 'title' | 'status' | 'category' | 'price_amount_cents' | 'created_at'
  >[];
  payments: Pick<
    PaymentRow,
    'id' | 'provider' | 'status' | 'amount_provider' | 'currency' | 'created_at'
  >[];
  settings: UserSettingsRow | null;
  logs: Pick<LogRow, 'id' | 'level' | 'context' | 'message' | 'created_at'>[];
};

export async function getUserDetail(id: string): Promise<UserDetail | null> {
  const supabase = getServiceClient();

  const [userResult, profilesResult, campaignsResult, paymentsResult, settingsResult, logsResult] =
    await Promise.all([
      supabase.from('users').select('*').eq('id', id).single(),
      supabase
        .from('profiles')
        .select(
          'id, user_id, name, is_default, full_name, email, headline, years_total, skills, resume_storage_path, resume_parsed_at, created_at, updated_at',
        )
        .eq('user_id', id)
        .order('is_default', { ascending: false }),
      supabase
        .from('campaigns')
        .select('id, title, status, category, price_amount_cents, created_at')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('payments')
        .select('id, provider, status, amount_provider, currency, created_at')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.from('user_settings').select('*').eq('user_id', id).maybeSingle(),
      supabase
        .from('app_logs')
        .select('id, level, context, message, created_at')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(30),
    ]);

  if (!userResult.data) return null;

  return {
    user: userResult.data as UserRow,
    profiles: (profilesResult.data ?? []) as ProfileRow[],
    campaigns: (campaignsResult.data ?? []) as UserDetail['campaigns'],
    payments: (paymentsResult.data ?? []) as UserDetail['payments'],
    settings: (settingsResult.data ?? null) as UserSettingsRow | null,
    logs: (logsResult.data ?? []) as UserDetail['logs'],
  };
}

// ---------------------------------------------------------------------------
// Campaigns
// ---------------------------------------------------------------------------

export type CampaignFilters = {
  status?: string | undefined;
  category?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
};

export type CampaignListItem = Pick<
  CampaignRow,
  | 'id'
  | 'user_id'
  | 'title'
  | 'status'
  | 'category'
  | 'quota'
  | 'progress_found'
  | 'progress_applied'
  | 'price_amount_cents'
  | 'created_at'
  | 'paid_at'
>;

export async function getCampaignsList(
  filters: CampaignFilters,
): Promise<{ rows: CampaignListItem[]; total: number }> {
  const supabase = getServiceClient();
  const limit = filters.limit ?? 20;
  const page = filters.page ?? 1;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('campaigns')
    .select(
      'id, user_id, title, status, category, quota, progress_found, progress_applied, price_amount_cents, created_at, paid_at',
    )
    .order('created_at', { ascending: false });

  let countQuery = supabase.from('campaigns').select('*', { count: 'exact', head: true });

  if (filters.status) {
    query = query.eq('status', filters.status);
    countQuery = countQuery.eq('status', filters.status);
  }
  if (filters.category) {
    query = query.eq('category', filters.category);
    countQuery = countQuery.eq('category', filters.category);
  }

  const [dataResult, countResult] = await Promise.all([
    query.range(offset, offset + limit - 1),
    countQuery,
  ]);

  return {
    rows: (dataResult.data ?? []) as CampaignListItem[],
    total: countResult.count ?? 0,
  };
}

export type SimulatorStateRow = {
  campaign_id: string;
  ticks_total: number;
  ticks_remaining: number;
  plateau_until: string | null;
  seed: number;
  locked_until: string | null;
  created_at: string;
  updated_at: string;
};

export type CampaignEventRow = {
  id: string;
  campaign_id: string;
  kind: string;
  text: string;
  data: Record<string, unknown> | null;
  created_at: string;
};

export type CampaignDetail = {
  campaign: CampaignRow;
  simulatorState: SimulatorStateRow | null;
  events: CampaignEventRow[];
  payment: Pick<
    PaymentRow,
    'id' | 'provider' | 'status' | 'amount_provider' | 'currency' | 'created_at'
  > | null;
};

export async function getCampaignDetail(id: string): Promise<CampaignDetail | null> {
  const supabase = getServiceClient();

  const [campaignResult, simResult, eventsResult, paymentResult] = await Promise.all([
    supabase.from('campaigns').select('*').eq('id', id).single(),
    supabase.from('campaign_simulator_state').select('*').eq('campaign_id', id).maybeSingle(),
    supabase
      .from('campaign_events')
      .select('id, campaign_id, kind, text, data, created_at')
      .eq('campaign_id', id)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('payments')
      .select('id, provider, status, amount_provider, currency, created_at')
      .eq('campaign_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!campaignResult.data) return null;

  return {
    campaign: campaignResult.data as CampaignRow,
    simulatorState: (simResult.data ?? null) as SimulatorStateRow | null,
    events: (eventsResult.data ?? []) as CampaignEventRow[],
    payment: (paymentResult.data ?? null) as CampaignDetail['payment'],
  };
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export type PaymentFilters = {
  provider?: string | undefined;
  status?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
};

export type PaymentListItem = Pick<
  PaymentRow,
  | 'id'
  | 'user_id'
  | 'campaign_id'
  | 'provider'
  | 'status'
  | 'amount_provider'
  | 'currency'
  | 'created_at'
  | 'confirmed_at'
>;

export async function getPaymentsList(
  filters: PaymentFilters,
): Promise<{ rows: PaymentListItem[]; total: number }> {
  const supabase = getServiceClient();
  const limit = filters.limit ?? 20;
  const page = filters.page ?? 1;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('payments')
    .select(
      'id, user_id, campaign_id, provider, status, amount_provider, currency, created_at, confirmed_at',
    )
    .order('created_at', { ascending: false });

  let countQuery = supabase.from('payments').select('*', { count: 'exact', head: true });

  if (filters.provider) {
    query = query.eq('provider', filters.provider);
    countQuery = countQuery.eq('provider', filters.provider);
  }
  if (filters.status) {
    query = query.eq('status', filters.status);
    countQuery = countQuery.eq('status', filters.status);
  }

  const [dataResult, countResult] = await Promise.all([
    query.range(offset, offset + limit - 1),
    countQuery,
  ]);

  return {
    rows: (dataResult.data ?? []) as PaymentListItem[],
    total: countResult.count ?? 0,
  };
}

export type PaymentDetail = {
  payment: PaymentRow;
  campaign: Pick<CampaignRow, 'id' | 'title' | 'status'> | null;
};

export async function getPaymentDetail(id: string): Promise<PaymentDetail | null> {
  const supabase = getServiceClient();

  const paymentResult = await supabase.from('payments').select('*').eq('id', id).single();
  if (!paymentResult.data) return null;

  const payment = paymentResult.data as PaymentRow;

  const campaignResult = await supabase
    .from('campaigns')
    .select('id, title, status')
    .eq('id', payment.campaign_id)
    .maybeSingle();

  return {
    payment,
    campaign: (campaignResult.data ?? null) as PaymentDetail['campaign'],
  };
}

// ---------------------------------------------------------------------------
// Logs
// ---------------------------------------------------------------------------

export type LogFilters = {
  level?: string | undefined;
  context?: string | undefined;
  userId?: string | undefined;
  since?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
};

export async function getLogs(filters: LogFilters): Promise<{ rows: LogRow[]; total: number }> {
  const supabase = getServiceClient();
  const limit = filters.limit ?? 50;
  const page = filters.page ?? 1;
  const offset = (page - 1) * limit;

  let query = supabase.from('app_logs').select('*').order('created_at', { ascending: false });

  let countQuery = supabase.from('app_logs').select('*', { count: 'exact', head: true });

  if (filters.level) {
    query = query.eq('level', filters.level);
    countQuery = countQuery.eq('level', filters.level);
  }
  if (filters.context) {
    query = query.ilike('context', `%${filters.context}%`);
    countQuery = countQuery.ilike('context', `%${filters.context}%`);
  }
  if (filters.userId) {
    query = query.eq('user_id', filters.userId);
    countQuery = countQuery.eq('user_id', filters.userId);
  }
  if (filters.since) {
    query = query.gte('created_at', filters.since);
    countQuery = countQuery.gte('created_at', filters.since);
  }

  const [dataResult, countResult] = await Promise.all([
    query.range(offset, offset + limit - 1),
    countQuery,
  ]);

  return {
    rows: (dataResult.data ?? []) as LogRow[],
    total: countResult.count ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Simulator
// ---------------------------------------------------------------------------

export type SimulatorCampaign = Pick<
  CampaignRow,
  | 'id'
  | 'title'
  | 'status'
  | 'quota'
  | 'progress_found'
  | 'progress_applied'
  | 'last_ticked_at'
  | 'created_at'
> & {
  simulatorState: SimulatorStateRow | null;
};

export async function getSimulatorCampaigns(): Promise<SimulatorCampaign[]> {
  const supabase = getServiceClient();

  const [campaignsResult, simResult] = await Promise.all([
    supabase
      .from('campaigns')
      .select(
        'id, title, status, quota, progress_found, progress_applied, last_ticked_at, created_at',
      )
      .in('status', ['paid', 'searching', 'applying'])
      .order('created_at', { ascending: false }),
    supabase.from('campaign_simulator_state').select('*'),
  ]);

  const campaigns = (campaignsResult.data ?? []) as Pick<
    CampaignRow,
    | 'id'
    | 'title'
    | 'status'
    | 'quota'
    | 'progress_found'
    | 'progress_applied'
    | 'last_ticked_at'
    | 'created_at'
  >[];

  const simMap: Record<string, SimulatorStateRow> = {};
  for (const s of (simResult.data ?? []) as SimulatorStateRow[]) {
    simMap[s.campaign_id] = s;
  }

  return campaigns.map((c) => ({
    ...c,
    simulatorState: simMap[c.id] ?? null,
  }));
}
