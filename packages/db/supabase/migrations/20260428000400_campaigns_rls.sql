-- ============================================================================
-- AI Job Bot — Wave B: RLS on campaigns.
-- Self-read / self-insert / self-update only. No client delete — cancellation
-- is a status flip via /api/campaigns/:id/cancel handled server-side.
-- ============================================================================

alter table public.campaigns enable row level security;

create policy campaigns_self_select
  on public.campaigns
  for select
  using (auth.uid() = user_id);

create policy campaigns_self_insert
  on public.campaigns
  for insert
  with check (auth.uid() = user_id);

create policy campaigns_self_update
  on public.campaigns
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
