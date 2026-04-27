-- ============================================================================
-- AI Job Bot — Wave D: payments table.
--
-- Frozen at Pay-button click (CLAUDE.md §8). UNIQUE(provider, provider_charge_id)
-- absorbs Telegram retries on the bot webhook (Stars) and duplicate confirms
-- on TonAPI poll loops (TON, Wave E).
-- ============================================================================

create type payment_provider as enum ('stars', 'ton');
create type payment_status   as enum ('pending', 'succeeded', 'failed');
create type payment_currency as enum ('STARS', 'TON');

comment on type payment_provider is 'Telegram Stars or TonConnect on-chain.';

create table public.payments (
  id                    uuid             primary key default gen_random_uuid(),
  user_id               uuid             not null references public.users(id) on delete restrict,
  campaign_id           uuid             not null references public.campaigns(id) on delete restrict,
  provider              payment_provider not null,
  -- Stars: telegram_payment_charge_id; TON: tx hash. Indexed by the UNIQUE.
  provider_charge_id    text             not null,
  status                payment_status   not null default 'pending',
  amount_cents          int              not null check (amount_cents >= 0),
  -- Stars: integer Stars units; TON: nano-TON (1 TON = 1e9 nano).
  amount_provider       numeric(20,9)    not null check (amount_provider >= 0),
  currency              payment_currency not null,
  -- Frozen at Pay click — duplicates campaigns.snapshot_data so payment replay
  -- never depends on the campaigns row staying readable.
  snapshot_data         jsonb            not null,
  snapshot_hash         text             not null,
  -- Client-supplied unique nonce (TON) or server-generated (Stars). Used for
  -- correlating async webhook results with the original init call.
  nonce                 text             not null,
  -- Full webhook / TonAPI payload kept for forensics.
  raw_event             jsonb,
  created_at            timestamptz      not null default now(),
  confirmed_at          timestamptz,

  constraint payments_provider_charge_unique
    unique (provider, provider_charge_id)
);

comment on table public.payments is
  'Frozen at Pay click. UNIQUE(provider, provider_charge_id) makes the webhook replay-safe per CLAUDE.md §8.';

create index payments_user_id_idx     on public.payments(user_id);
create index payments_campaign_id_idx on public.payments(campaign_id);
create index payments_status_idx      on public.payments(status);
create index payments_pending_idx
  on public.payments(created_at)
  where status = 'pending';
