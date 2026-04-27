-- ============================================================================
-- AI Job Bot — Wave D: RLS on payments.
-- Self-read only. Inserts, status flips, and event capture are all
-- service-role (the bot webhook + /api/payments/init + /api/payments/confirm).
-- ============================================================================

alter table public.payments enable row level security;

create policy payments_self_select
  on public.payments
  for select
  using (auth.uid() = user_id);
