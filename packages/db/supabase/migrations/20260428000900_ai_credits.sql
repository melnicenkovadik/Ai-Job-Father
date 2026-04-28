-- ============================================================================
-- AI Job Bot — ai_credits table.
--
-- Per-user, per-feature credit grant for AI-gated features (e.g. resume
-- AI re-parse). One row = one Stars payment. Consumption is single-use,
-- marked by `consumed_at`. UNIQUE(charge_id) absorbs Telegram retries on
-- the bot webhook (same dedup discipline as payments).
--
-- Why a separate table from `payments`:
--   - `payments.campaign_id` is NOT NULL by design (it's the campaign-pay table).
--   - Mixing AI-feature payments would force schema changes on a stable surface.
--   - Cleaner separation of concerns: campaign payments vs ad-hoc credits.
-- ============================================================================

create type ai_credit_feature as enum ('resume_parse');

comment on type ai_credit_feature is
  'Append-only enum. Add new AI-gated features here as they ship. Never remove.';

create table public.ai_credits (
  id            uuid              primary key default gen_random_uuid(),
  user_id       uuid              not null references public.users(id) on delete cascade,
  feature       ai_credit_feature not null,
  -- Telegram payment charge id; uniqueness absorbs Telegram webhook retries.
  charge_id     text              not null,
  stars_amount  int               not null check (stars_amount > 0),
  created_at    timestamptz       not null default now(),
  -- Set when the credit is spent. NULL means "available". Single-use.
  consumed_at   timestamptz,

  constraint ai_credits_charge_unique unique (charge_id)
);

comment on table public.ai_credits is
  'One row per Stars payment for an AI-gated feature. consumed_at NULL = available.';
comment on column public.ai_credits.consumed_at is
  'Set on the first successful AI call that uses this credit. Idempotent — second consume is a no-op.';

create index ai_credits_user_unconsumed_idx
  on public.ai_credits(user_id, feature)
  where consumed_at is null;

create index ai_credits_user_id_idx on public.ai_credits(user_id);

-- ----------------------------------------------------------------------------
-- RLS — service-role only. The web app reads/writes via service-role inside
-- the parse endpoint; users never touch this table directly.
-- ----------------------------------------------------------------------------
alter table public.ai_credits enable row level security;
