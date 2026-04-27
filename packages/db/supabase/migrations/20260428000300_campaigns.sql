-- ============================================================================
-- AI Job Bot — Wave B: campaigns table + status enum + immutability trigger.
-- A campaign represents one paid run of the job-search engine for a user. The
-- table holds both the immutable snapshot taken at Pay click (CLAUDE.md §8)
-- and the mutable progress counters the lazy-tick simulator updates.
-- ============================================================================

create type campaign_status as enum (
  'draft',
  'paid',
  'searching',
  'applying',
  'completed',
  'failed',
  'cancelled'
);

comment on type campaign_status is
  'Lifecycle state machine. See packages/core/src/domain/campaign-status.ts for legal transitions.';

create table public.campaigns (
  id                       uuid             primary key default gen_random_uuid(),
  user_id                  uuid             not null references public.users(id) on delete cascade,
  profile_id               uuid             not null references public.profiles(id) on delete restrict,

  title                    text             not null
                                            check (char_length(title) between 1 and 80),
  category                 job_category     not null,
  status                   campaign_status  not null default 'draft',
  quota                    int              not null
                                            check (quota between 1 and 500),
  countries                text[]           not null default '{}'
                                            check (
                                              array_length(countries, 1) is null
                                              or array_length(countries, 1) <= 15
                                            ),

  -- Pricing — server-recomputed via priceCampaign() in packages/core; never trusted from client.
  price_amount_cents       int              not null check (price_amount_cents >= 0),
  price_breakdown          jsonb            not null default '{}'::jsonb,

  -- Progress (mutable while running)
  progress_found           int              not null default 0 check (progress_found >= 0),
  progress_applied         int              not null default 0 check (progress_applied >= 0),
  last_ticked_at           timestamptz,
  last_event_at            timestamptz,

  -- Snapshot frozen at Pay click; immutability trigger blocks further snapshot writes.
  snapshot_data            jsonb,
  snapshot_schema_version  int,

  -- Lifecycle timestamps
  paid_at                  timestamptz,
  started_at               timestamptz,
  completed_at             timestamptz,
  cancelled_at             timestamptz,

  created_at               timestamptz      not null default now(),
  updated_at               timestamptz      not null default now()
);

comment on table public.campaigns is
  'One row per campaign. Snapshot frozen at Pay click; progress mutated by simulator (Wave F) or downstream service.';

create index campaigns_user_id_idx           on public.campaigns(user_id);
create index campaigns_status_idx            on public.campaigns(status);
create index campaigns_user_status_idx       on public.campaigns(user_id, status);
create index campaigns_status_last_ticked_idx
  on public.campaigns(last_ticked_at)
  where status in ('searching', 'applying');

create trigger campaigns_updated_at
  before update on public.campaigns
  for each row
  execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Snapshot immutability trigger (CLAUDE.md §8)
-- Once status crosses into the "paid+" half of the lifecycle, the snapshot
-- payload itself is locked. Status transitions, progress updates, and lifecycle
-- timestamps remain editable so the simulator can still advance the row.
-- ----------------------------------------------------------------------------
create or replace function public.enforce_campaign_snapshot_immutability()
  returns trigger
  language plpgsql
  as $$
  begin
    if old.snapshot_data is distinct from new.snapshot_data
       and old.status in ('paid', 'searching', 'applying', 'completed') then
      raise exception 'campaigns.snapshot_data is immutable once status >= paid (was %, is %)',
        old.status, new.status;
    end if;
    return new;
  end;
  $$;

create trigger campaigns_snapshot_immutable
  before update on public.campaigns
  for each row
  execute function public.enforce_campaign_snapshot_immutability();
