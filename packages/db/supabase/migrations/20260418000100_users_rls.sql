-- ============================================================================
-- AI Job Bot — Phase 1: RLS policies on public.users
-- users can read + update their own row. No direct insert from clients.
-- Inserts happen via service-role during initData verification (auth/session route).
-- ============================================================================

alter table public.users enable row level security;

create policy users_self_read
  on public.users
  for select
  using (id = auth.uid());

create policy users_self_update
  on public.users
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- NO insert policy for clients. service-role bypasses RLS.
-- NO delete policy: deletion goes through a GDPR RPC in Phase 7.

comment on policy users_self_read on public.users
  is 'Phase 1 RLS. auth.uid() comes from the Supabase JWT sub claim, minted by /api/auth/session.';
comment on policy users_self_update on public.users
  is 'Phase 1 RLS. Same-row self-update only.';
