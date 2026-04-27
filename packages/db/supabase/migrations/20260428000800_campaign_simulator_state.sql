-- ============================================================================
-- AI Job Bot — Wave F: simulator state.
--
-- Owned by the simulator adapter (apps/web/lib/sim/*). Holds whatever the
-- realistic-progress simulator needs: a deterministic seed, a candidate-name
-- pool, plateau timing, and a row-level lock so concurrent lazy-ticks (two
-- GETs racing) don't double-advance progress.
--
-- When the real downstream scraper replaces the simulator, this table can be
-- dropped or ignored — campaigns + campaign_events are the source of truth.
-- ============================================================================

create table public.campaign_simulator_state (
  campaign_id     uuid        primary key references public.campaigns(id) on delete cascade,
  ticks_total     int         not null default 0,
  ticks_remaining int         not null,
  plateau_until   timestamptz,
  candidate_pool  jsonb       not null default '[]'::jsonb,
  seed            bigint      not null,
  locked_until    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.campaign_simulator_state is
  'Per-campaign simulator scratch space. Owned by the simulator adapter — drop when a real driver takes over.';

create index campaign_simulator_state_locked_until_idx
  on public.campaign_simulator_state(locked_until);

create trigger campaign_simulator_state_updated_at
  before update on public.campaign_simulator_state
  for each row
  execute function public.set_updated_at();

-- RLS enabled with no policies — only service-role touches this table.
alter table public.campaign_simulator_state enable row level security;
