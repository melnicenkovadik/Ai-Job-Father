-- ============================================================================
-- AI Job Bot — Phase 2: resumes Storage bucket + access policies
-- Per-user private bucket — users may only read/write objects under their
-- own {user_id}/ prefix. Service-role bypasses for server-side AI parse.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resumes',
  'resumes',
  false,                                   -- private; signed URLs only
  10 * 1024 * 1024,                        -- 10 MB max per file
  array['application/pdf']                 -- Phase 2 accepts PDF only
)
on conflict (id) do nothing;

-- Path convention: {user_id}/{timestamp}.pdf
-- split_part(name, '/', 1) extracts the user_id prefix.

create policy resumes_self_select
  on storage.objects
  for select
  using (
    bucket_id = 'resumes'
    and (split_part(name, '/', 1))::uuid = auth.uid()
  );

create policy resumes_self_insert
  on storage.objects
  for insert
  with check (
    bucket_id = 'resumes'
    and (split_part(name, '/', 1))::uuid = auth.uid()
  );

create policy resumes_self_update
  on storage.objects
  for update
  using (
    bucket_id = 'resumes'
    and (split_part(name, '/', 1))::uuid = auth.uid()
  )
  with check (
    bucket_id = 'resumes'
    and (split_part(name, '/', 1))::uuid = auth.uid()
  );

create policy resumes_self_delete
  on storage.objects
  for delete
  using (
    bucket_id = 'resumes'
    and (split_part(name, '/', 1))::uuid = auth.uid()
  );

-- Note: `comment on policy` for storage.objects requires ownership which the
-- Supabase pooler role doesn't have. Rationale lives in the header block above.
