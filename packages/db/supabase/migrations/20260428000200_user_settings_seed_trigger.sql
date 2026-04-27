-- ============================================================================
-- AI Job Bot — Wave A: auto-create user_settings row on user insert
-- Avoids a "settings row missing" race the first time a freshly-onboarded user
-- opens the Settings screen. Idempotent via on conflict — if the row already
-- exists for any reason, the trigger is a no-op.
-- ============================================================================

create or replace function public.create_user_settings_row()
  returns trigger
  language plpgsql
  security definer
  as $$
  begin
    insert into public.user_settings (user_id, locale)
    values (new.id, new.locale)
    on conflict (user_id) do nothing;
    return new;
  end;
  $$;

create trigger users_after_insert_create_settings
  after insert on public.users
  for each row
  execute function public.create_user_settings_row();

-- Backfill: every existing user gets a settings row matching their current locale.
insert into public.user_settings (user_id, locale)
select id, locale from public.users
on conflict (user_id) do nothing;
