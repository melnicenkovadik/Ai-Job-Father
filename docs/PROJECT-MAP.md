# Project Map — AI Job Bot

**Last updated:** 2026-04-16 (Phase 0 in progress)

## Live Systems

| System | Status | Notes |
|---|---|---|
| Bot (Telegram) | **not registered** | BotFather creation in Phase 1 |
| Mini App | **not deployed** | local dev only; Vercel in Phase 7 |
| Supabase (local) | **scaffolded** | `packages/db/supabase/config.toml` exists; `supabase start` requires Docker, run on demand |
| Supabase (cloud) | **not created** | deferred to Phase 1 or 7 |
| Anthropic | **not configured** | Phase 2 |
| TON / Stars | **not configured** | Phase 4 |
| Sentry | **not configured** | Phase 7 |
| GitHub repo | **not created** | deferred per user request |

## Data Model (current)

No tables. Extensions installed by migration `20260417000000_init.sql`:
- `pgcrypto` — `gen_random_uuid()` for subsequent tables.
- `pg_trgm` — text similarity (dedup + ESCO search in Phase 3).
- `uuid-ossp` — belt-and-suspenders for UUID generation.

| Phase | Adds |
|---|---|
| 1 | `users` (Telegram-id-keyed, RLS enabled) |
| 2 | `profiles` (multi-per-user, partial unique on `is_default`), Storage bucket `resumes` |
| 3 | `campaigns` (snapshot_data JSONB + trigger + indexes + view), `esco_cache` |
| 4 | `payments` (unique on provider+provider_charge_id), immutability trigger activated |
| 5 | `notifications` (outbox) |

## Flows Working End-to-End

- ✅ `pnpm dev` boots Next.js; `GET /api/health` returns 200 JSON (Phase 0)
- ✅ `pnpm --filter @ai-job-bot/core test` runs Vitest smoke test (Phase 0)
- ⏳ `supabase start` + `supabase db reset` applies init migration (Phase 0 — pending Docker)
- ⏳ `/start` → `users` row upserted → Mini App opens with localized greeting (Phase 1)
- ⏳ PDF upload → Claude parses → review → `profiles` row (Phase 2)
- ⏳ 8-step wizard → `campaigns (draft)` (Phase 3)
- ⏳ Pay via Stars or TON → `status=paid` → snapshot frozen → push notification (Phase 4)
- ⏳ Dashboard lists campaigns; settings lets user override locale (Phase 5)
- ⏳ 5 languages translated; WCAG AA; visual regression green (Phase 6)
- ⏳ Production deployed; Sentry live; RUNBOOK complete (Phase 7)

## Active Features

| Feature | Phase | Doc |
|---|---|---|
| Bootstrap & scaffolding | 0 | [bootstrap.md](./features/bootstrap.md) |

## Open Issues / Technical Debt

- None at Phase 0.

## Env Vars Required (by phase)

| Var | Phase | Source |
|---|---|---|
| `NODE_ENV` | 0 | implicit (set by Next.js / Node) |
| `SUPABASE_URL`, `SUPABASE_*_KEY`, `SUPABASE_JWT_SECRET`, `NEXT_PUBLIC_SUPABASE_*` | 1 | `supabase status` (local) or Supabase dashboard (cloud) |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET_TOKEN`, `NEXT_PUBLIC_MINI_APP_URL` | 1 | BotFather |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | 2 | Anthropic console |
| `ESCO_API_BASE` | 3 | (default `https://ec.europa.eu/esco/api`) |
| `TON_API_KEY`, `TON_NETWORK`, `TON_MANIFEST_URL`, `TON_PAYMENT_RECIPIENT_ADDRESS` | 4 | tonapi.io + self-hosted manifest |
| `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN` | 7 | Sentry console |

## How to Resume From Cold

1. Read `/CLAUDE.md` — rules + cold-boot protocol.
2. Read this file — current state.
3. Read the latest `docs/CHANGELOG.md` entry — what just shipped.
4. Read the latest `docs/SESSION-LOG.md` entry — what was discussed last.
5. Read `.planning/phases/<current>/verify.md` — proof of the last completed phase.
6. Check `.planning/phases/<next>/PLAN.md` if planning the next phase.
7. Confirm boot:
   ```bash
   pnpm install
   pnpm dev
   curl http://localhost:3000/api/health
   ```
