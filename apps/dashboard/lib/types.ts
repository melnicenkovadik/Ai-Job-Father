// Lightweight row types used across queries. Mirrors current migration schema.
// If migrations drift, these surface compile errors only where used — preferred over
// regenerating Supabase types every time the dashboard ships.

export type CampaignStatus =
  | 'draft'
  | 'paid'
  | 'searching'
  | 'applying'
  | 'completed'
  | 'cancelled'
  | 'failed';

export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';
export type PaymentProvider = 'stars' | 'ton';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export type CampaignRow = {
  id: string;
  user_id: string;
  profile_id: string | null;
  title: string;
  status: CampaignStatus;
  category: string;
  quota: number;
  countries: string[];
  price_amount_cents: number;
  progress_found: number;
  progress_applied: number;
  last_ticked_at: string | null;
  snapshot_data: Record<string, unknown>;
  paid_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PaymentRow = {
  id: string;
  user_id: string;
  campaign_id: string;
  provider: PaymentProvider;
  provider_charge_id: string | null;
  status: PaymentStatus;
  amount_cents: number;
  amount_provider: number | string;
  currency: string;
  snapshot_data: Record<string, unknown>;
  nonce: string | null;
  raw_event: Record<string, unknown> | null;
  confirmed_at: string | null;
  created_at: string;
};

export type LogRow = {
  id: string;
  level: LogLevel;
  source: string;
  context: string | null;
  message: string;
  data: Record<string, unknown> | null;
  error_name: string | null;
  error_message: string | null;
  error_stack: string | null;
  user_id: string | null;
  telegram_id: number | null;
  url: string | null;
  user_agent: string | null;
  created_at: string;
};

export type UserRow = {
  id: string;
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  locale: string | null;
  is_premium: boolean | null;
  timezone: string | null;
  created_at: string;
  updated_at: string;
};
