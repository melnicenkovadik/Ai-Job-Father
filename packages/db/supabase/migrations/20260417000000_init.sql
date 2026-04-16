-- ============================================================================
-- AI Job Bot — initial migration (Phase 0 scaffolding)
-- Establishes extensions used across subsequent migrations.
-- Tables land in Phase 1 (users), Phase 2 (profiles + resumes bucket),
-- Phase 3 (campaigns + esco_cache), Phase 4 (payments), Phase 5 (notifications).
-- ============================================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "pg_trgm";    -- text similarity (dedup, esco search)
create extension if not exists "uuid-ossp";  -- belt-and-suspenders

-- No tables in this migration.
-- This file exists so `supabase db reset` has a migration to apply and
-- `supabase gen types` can produce a valid (empty) Database type.
