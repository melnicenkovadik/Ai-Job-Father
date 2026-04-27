-- ============================================================================
-- AI Job Bot — Wave A: user_settings table
-- 1:1 with public.users. Stores locale preference, notification toggles, and
-- the onboarding flag. Locale also lives on users (auto-detected on first
-- /start) — user_settings.locale is the override the user can change in
-- Settings screen.
-- ============================================================================

create table public.user_settings (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null unique references public.users(id) on delete cascade,
  locale          text        not null default 'en'
                              check (locale in ('en','uk','ru','it','pl')),
  notify_push     boolean     not null default true,
  notify_email    boolean     not null default false,
  notify_weekly   boolean     not null default true,
  has_onboarded   boolean     not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.user_settings
  is 'Per-user preferences. Auto-created on user insert via trigger.';
comment on column public.user_settings.locale
  is 'User-overridable locale. Falls back to users.locale if no row.';
comment on column public.user_settings.has_onboarded
  is 'Set to true after the user clears the onboarding screen.';

create index user_settings_user_id_idx on public.user_settings(user_id);

-- Reuses the set_updated_at() function declared in 20260418000000_users.sql
create trigger user_settings_updated_at
  before update on public.user_settings
  for each row
  execute function public.set_updated_at();
