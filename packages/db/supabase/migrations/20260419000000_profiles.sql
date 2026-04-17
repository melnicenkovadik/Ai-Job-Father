-- ============================================================================
-- AI Job Bot — Phase 2: profiles table
-- Multi-per-user: a single user may have several named profiles
-- ("Frontend EU", "AI Senior US"), one marked as default. Campaign wizard
-- preselects the default; user can switch or create new mid-wizard.
--
-- A partial-unique index enforces "exactly one default per user" — updating
-- another profile to default requires flipping the previous one to false
-- in the same transaction (handled by the application layer).
-- ============================================================================

create type job_category as enum (
  'tech',
  'design',
  'marketing',
  'sales',
  'product',
  'finance',
  'hr',
  'support',
  'content',
  'ops',
  'data',
  'web3'
);

comment on type job_category is
  '12 fixed category slugs. Mirrors packages/core/src/domain/job-category.ts JOB_CATEGORIES. Enum is append-only — new categories add via alter type; never remove.';

create table public.profiles (
  id                   uuid        primary key default gen_random_uuid(),
  user_id              uuid        not null references public.users(id) on delete cascade,
  name                 text        not null,
  is_default           boolean     not null default false,
  preferred_categories job_category[] not null default '{}'::job_category[],

  -- Contact block
  full_name            text,
  email                text,
  phone                text,
  location             text,        -- free text "Kyiv, Ukraine" or "Remote"
  address              text,
  timezone             text,        -- IANA tz, e.g. "Europe/Kyiv"

  -- Public profiles
  linkedin_url         text,
  github_url           text,
  telegram_url         text,
  twitter_url          text,
  portfolio_url        text,

  -- Narrative
  headline             text,
  summary              text,
  years_total          int,
  english_level        text,        -- CEFR A1..C2

  -- Structured arrays (AI parse target in Phase 2 — AI parses PDF into these)
  skills               jsonb        not null default '[]'::jsonb,   -- [{name, years?, level?}]
  experience           jsonb        not null default '[]'::jsonb,   -- [{company, role, start, end, description, stack}]
  education            jsonb        not null default '[]'::jsonb,   -- [{school, degree, start, end}]
  languages            jsonb        not null default '[]'::jsonb,   -- [{code, level}]
  category_fields      jsonb        not null default '{}'::jsonb,   -- per-category specifics, shape in packages/core/domain/category-fields/*

  -- Resume provenance
  resume_storage_path  text,        -- "resumes/{user_id}/{timestamp}.pdf" in Storage
  resume_parsed_at     timestamptz,
  resume_parse_model   text,        -- e.g. "claude-sonnet-4-5"
  resume_file_hash     text,        -- sha256 of the uploaded PDF, for dedup

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  constraint profiles_name_length check (char_length(name) between 1 and 40),
  constraint profiles_years_total_range check (years_total is null or (years_total >= 0 and years_total <= 80))
);

-- exactly one default profile per user
create unique index profiles_one_default_per_user
  on public.profiles(user_id)
  where is_default = true;

-- hot lookup paths
create index profiles_user_id_idx on public.profiles(user_id);
create index profiles_user_id_default_idx on public.profiles(user_id) where is_default = true;

-- updated_at trigger (reuses the function created by the users migration)
create trigger profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

comment on table public.profiles is
  'Resume-derived user identity. Multi-per-user: one default + N alternates. Snapshot_profile on campaigns freezes a copy at checkout click (Phase 4) — edits to the source profile after a campaign is paid do not poison the run.';
comment on column public.profiles.is_default is
  'Exactly one default per user (enforced by partial-unique index profiles_one_default_per_user).';
comment on column public.profiles.preferred_categories is
  'Highlighted in the wizard Step 0 category picker. Does not restrict campaign creation — any of the 12 slugs is always allowed.';
comment on column public.profiles.resume_file_hash is
  'SHA-256 of the uploaded PDF bytes. Blocks re-parsing the same file within the per-user 60s cooldown (Phase 2 adapter).';
