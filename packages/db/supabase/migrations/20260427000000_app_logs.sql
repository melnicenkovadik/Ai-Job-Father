-- ============================================================================
-- AI Job Bot — App-wide structured logs.
-- Every client + server error / meaningful action is written here so that
-- bugs reproducible only on the user's device can still be diagnosed
-- (Vercel runtime-logs API is unavailable on the Hobby plan).
-- ============================================================================

create table public.app_logs (
  id            uuid        primary key default gen_random_uuid(),
  level         text        not null check (level in ('debug','info','warn','error')),
  source        text        not null check (source in ('web','bot','api')),
  context       text        not null,
  message       text        not null,
  data          jsonb,
  error_name    text,
  error_message text,
  error_stack   text,
  user_id       uuid        references public.users(id) on delete set null,
  telegram_id   bigint,
  url           text,
  user_agent    text,
  created_at    timestamptz not null default now()
);

comment on table public.app_logs
  is 'Structured application log; every catch block + key user action writes here. Append-only.';
comment on column public.app_logs.context
  is 'Logical scope of the event, e.g. "auth-gate", "api/auth/session", "campaign-wizard.step-3".';
comment on column public.app_logs.data
  is 'Arbitrary JSON metadata; PII allowed only behind explicit redaction.';

create index app_logs_created_at_idx on public.app_logs (created_at desc);
create index app_logs_level_idx      on public.app_logs (level);
create index app_logs_user_id_idx    on public.app_logs (user_id);
create index app_logs_context_idx    on public.app_logs (context);

-- ----------------------------------------------------------------------------
-- RLS: users may only read their own log rows. No client-side insert/update.
-- The service role (used by /api/logs and server code) bypasses RLS entirely.
-- ----------------------------------------------------------------------------

alter table public.app_logs enable row level security;

create policy app_logs_self_read on public.app_logs
  for select using (auth.uid() = user_id);
