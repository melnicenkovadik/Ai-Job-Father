-- ============================================================================
-- AI Job Bot — Wave A: RLS on user_settings
-- Pattern mirrors 20260418000100_users_rls.sql:
--   - Self-read by user_id = auth.uid()
--   - Self-update for own row
--   - Insert via service role only (the after-insert trigger)
-- ============================================================================

alter table public.user_settings enable row level security;

create policy user_settings_self_read
  on public.user_settings
  for select
  using (auth.uid() = user_id);

create policy user_settings_self_update
  on public.user_settings
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
