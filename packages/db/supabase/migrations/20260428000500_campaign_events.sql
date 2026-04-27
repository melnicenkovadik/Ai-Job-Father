-- ============================================================================
-- AI Job Bot — Wave B: campaign_events table.
-- Append-only event log surfaced as the timeline UI in campaign-detail-screen.
-- Service-role-only writes (by the recordPayment use case for paid/started
-- events, and the simulator driver for found/applied/completed events).
-- ============================================================================

create type campaign_event_kind as enum (
  'paid',
  'started',
  'found',
  'applied',
  'completed',
  'failed',
  'info'
);

comment on type campaign_event_kind is
  'Event categories for the timeline. Mirrors packages/core/src/domain/campaign-event.ts factories.';

create table public.campaign_events (
  id           uuid                primary key default gen_random_uuid(),
  campaign_id  uuid                not null references public.campaigns(id) on delete cascade,
  -- user_id denormalised so RLS can key on auth.uid() = user_id without a join.
  user_id      uuid                not null references public.users(id) on delete cascade,
  kind         campaign_event_kind not null,
  text         text                not null check (char_length(text) between 1 and 200),
  data         jsonb,
  created_at   timestamptz         not null default now()
);

comment on table public.campaign_events is
  'Append-only timeline of events per campaign. Service-role-only writes (no client policies).';

create index campaign_events_campaign_id_created_at_idx
  on public.campaign_events(campaign_id, created_at desc);
create index campaign_events_user_id_idx on public.campaign_events(user_id);

-- ----------------------------------------------------------------------------
-- RLS: self-read only. Inserts come exclusively from service-role code paths.
-- ----------------------------------------------------------------------------
alter table public.campaign_events enable row level security;

create policy campaign_events_self_select
  on public.campaign_events
  for select
  using (auth.uid() = user_id);
