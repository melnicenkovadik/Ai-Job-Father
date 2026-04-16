-- ============================================================================
-- AI Job Bot — Phase 1: users table
-- Identity row upserted on Telegram initData verification.
-- Every subsequent table FK-refs users(id); JWT claim sub = users.id.
-- ============================================================================

create table public.users (
  id            uuid        primary key default gen_random_uuid(),
  telegram_id   bigint      not null unique,
  username      text,
  first_name    text,
  last_name     text,
  locale        text        not null default 'en',
  is_premium    boolean     not null default false,
  timezone      text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on column public.users.telegram_id
  is 'Telegram user id (numeric). Unique; this is the IdP key.';
comment on column public.users.locale
  is 'ISO 639-1 code. One of: en, uk, ru, it, pl. Auto-detected from initData.user.language_code on first /start.';

create index users_telegram_id_idx on public.users(telegram_id);

-- updated_at auto-maintenance
create or replace function public.set_updated_at()
  returns trigger
  language plpgsql
  as $$
  begin
    new.updated_at = now();
    return new;
  end;
  $$;

create trigger users_updated_at
  before update on public.users
  for each row
  execute function public.set_updated_at();
