# ADR 0002 — Supabase is the shared DB between Mini App and downstream worker

**Status:** Accepted (2026-04-16)

## Context

The Mini App collects user intent (paid campaigns) and writes it to a database. A separate
downstream service (evolution of the existing `job-hunter` repo) reads paid campaigns and
executes scraping/applying. The two services must agree on:
- Campaign shape (the `snapshot_data` JSONB contract).
- Who writes what (Mini App writes everything; downstream writes only execution state).
- Immutability of paid campaigns (the user paid for a specific snapshot; it can't be altered
  after payment).

Options: one DB for both / two DBs with CDC / REST API in between.

## Decision

**Single Supabase Postgres project** hosts both services' data. Migrations live in
`packages/db/supabase/migrations/`.

- **Mini App writes:** upsert to `users`, CRUD on `profiles`, CRUD on `campaigns` (draft →
  paid), inserts to `payments`, `notifications`.
- **Downstream reads:** via `v_paid_campaigns_for_worker` Postgres VIEW that projects only the
  fields the worker needs.
- **Downstream writes:** a narrow `job_hunter_worker` Postgres role is granted
  `UPDATE (status, started_at, completed_at, applications_submitted)` on `campaigns` only —
  nothing else.
- **Immutability** enforced by a `BEFORE UPDATE` trigger on `campaigns` that raises if
  `snapshot_data`, `snapshot_profile`, `category`, or `target_quota` changes while
  `status IN ('paid','running','completed')`.
- **Schema versioning:** `snapshot_data.schema_version` (integer) lets downstream refuse to
  process versions it doesn't know about.

RLS policies on every table enforce `auth.uid() = user_id` isolation between users.

## Consequences

**Positive:**
- No drift between services — they literally look at the same rows.
- Schema evolution is a single Supabase migration, not a cross-service coordination.
- RLS gives us per-user isolation for free, which we'd otherwise reimplement as app-layer checks.
- Downstream can be implemented in Python (as `job-hunter` already is) or TS — the contract is
  pure SQL.

**Negative:**
- Coupling: breaking schema changes affect both services simultaneously. Mitigated by
  `snapshot_data.schema_version` versioning.
- Shared Supabase project cost is attributed to the Mini App side even though downstream is
  a large consumer. Acceptable — Supabase Pro is flat-rate for MVP volumes.

## Alternatives Considered

1. **Separate DBs + CDC (Debezium, Supabase Realtime).** Rejected: over-engineered for MVP.
   Introduces eventual consistency where we need transactional guarantees (immutability trigger).

2. **REST API between Mini App and worker.** Rejected: extra network hop, auth complexity, and
   forces us to serialize/deserialize the `snapshot_data` JSON twice. The database IS the API.
