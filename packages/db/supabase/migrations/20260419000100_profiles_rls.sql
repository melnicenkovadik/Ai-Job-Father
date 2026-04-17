-- ============================================================================
-- AI Job Bot — Phase 2: RLS policies on public.profiles
-- Users read/write their own profiles only. Service-role bypasses RLS
-- for server-side writes (e.g. AI resume parse → save-profile use case).
-- ============================================================================

alter table public.profiles enable row level security;

create policy profiles_self_select
  on public.profiles
  for select
  using (user_id = auth.uid());

create policy profiles_self_insert
  on public.profiles
  for insert
  with check (user_id = auth.uid());

create policy profiles_self_update
  on public.profiles
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy profiles_self_delete
  on public.profiles
  for delete
  using (user_id = auth.uid());

comment on policy profiles_self_select on public.profiles
  is 'Phase 2 RLS. auth.uid() comes from the Supabase JWT sub claim.';
comment on policy profiles_self_insert on public.profiles
  is 'Clients may insert new profiles directly; service-role also writes on AI parse.';
comment on policy profiles_self_update on public.profiles
  is 'Same-row self-update only.';
comment on policy profiles_self_delete on public.profiles
  is 'Users can delete their own profiles. GDPR cascade is handled via users.id ON DELETE CASCADE.';
