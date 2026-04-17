# Project Map — AI Job Bot

**Last updated:** 2026-04-17 (Phase 1 shipped; BotFather menu button + real-device flow are the
only open Phase-1 user checkpoints)

## Live Systems

| System | Status | Notes |
|---|---|---|
| **Bot (Telegram)** | **token issued** | @AiJobFatherBot, token in `TELEGRAM_BOT_TOKEN`. `/setmenubutton` with the Vercel URL is a pending user action. |
| **Mini App** | **deploys to Vercel via GitHub integration** | GitHub remote: `git@github.com:melnicenkovadik/Ai-Job-Father.git`. Vercel project linked + Supabase Marketplace integration active. |
| **Supabase (cloud)** | **live** | Project `fixvzokjvqgqyzdidabo`, eu-central-2. `public.users` + RLS policies applied. |
| **Supabase (local)** | scaffolded (unused) | `supabase/config.toml` present but Docker not required — dev hits Cloud via `.env.local`. |
| **Anthropic** | not configured | Phase 2 |
| **TON / Stars** | not configured | Phase 4 |
| **Sentry** | not configured | Phase 7 |
| **GitHub repo** | **created + pushed** | `melnicenkovadik/Ai-Job-Father`. `main` tracks origin; git identity is `melnicenkovadik <melnicenkovadik@gmail.com>` (verified after a one-off HTTPS-creds mismatch was corrected by switching remote to SSH). |

## Data Model (current)

| Table | Phase | Columns | RLS |
|---|---|---|---|
| `public.users` | 1 | `id uuid PK`, `telegram_id bigint UNIQUE`, `username`, `first_name`, `last_name`, `locale`, `is_premium`, `timezone`, `created_at`, `updated_at` (trigger-maintained) | enabled; `users_self_read` + `users_self_update` keyed on `auth.uid() = id`; service-role bypasses for inserts |

Phase-2+ tables live on `.planning/ROADMAP.md`:
| Phase | Adds |
|---|---|
| 2 | `profiles` (multi-per-user, partial unique on `is_default`), Storage bucket `resumes` |
| 3 | `campaigns` (snapshot_data JSONB + immutability trigger + view + indexes), `esco_cache` |
| 4 | `payments` (unique on provider+provider_charge_id) |
| 5 | `notifications` outbox |

Extensions installed by `20260417000000_init.sql`: `pgcrypto`, `pg_trgm`, `uuid-ossp`.

## Flows Working End-to-End

- ✅ `pnpm dev` + `curl /api/health` → 200 (Phase 0)
- ✅ `pnpm --filter @ai-job-bot/core test` → 39 tests green (Phase 0 + 1)
- ✅ `pnpm --filter @ai-job-bot/web test` → 23 tests green (verify-init-data, jwt,
  user-repo, messages-parity)
- ✅ `supabase db push --db-url $POSTGRES_URL_NON_POOLING` → migrations land on Cloud (Phase 1)
- ✅ `/start` in Telegram → handler replies with `Open App` button + `setMyCommands` live
  (Phase 1 — verified by unit tests; real device flow pending menu button)
- ✅ Mini App webview open → greeting renders with `firstName` from initData (Phase 1 —
  pending real device handshake, local build proves wiring)
- ✅ `/api/auth/session` with signed initData → upsert `users` row + mint Supabase JWT +
  pass RLS (Phase 1 — covered by unit + integration tests)
- ⏳ PDF upload → Claude parses → review → `profiles` row (Phase 2)
- ⏳ 3-screen wizard → `campaigns (draft)` with valid snapshot (Phase 3, per
  `~/.claude/plans/lucky-noodling-pike.md`)
- ⏳ Pay via Stars or TON → `status=paid` → snapshot frozen → push notification (Phase 4)
- ⏳ Dashboard lists campaigns; settings lets user override locale (Phase 5)
- ⏳ 5 languages translated; WCAG AA; visual regression green (Phase 6)
- ⏳ Production deployed; Sentry live; RUNBOOK complete (Phase 7)

## Active Features

| Feature | Phase | Doc |
|---|---|---|
| Bootstrap & scaffolding | 0 | [bootstrap.md](./features/bootstrap.md) |
| Auth skeleton | 1 | [auth-skeleton.md](./features/auth-skeleton.md) |
| Responsive UI contract | 1 | [ui-contract.md](./features/ui-contract.md) |
| i18n skeleton | 1 | [i18n-skeleton.md](./features/i18n-skeleton.md) |
| Bot commands | 1 | [bot-commands.md](./features/bot-commands.md) |

## Route Map

- **`/`** → Mini App greeting (`app/(app)/page.tsx` under `(app)` layout with
  `NextIntlClientProvider` + `TelegramProvider`).
- **`/ui-contract`** → dev fixture (`app/(dev)/ui-contract/page.tsx` under bare `(dev)`
  layout; no provider chain).
- **`/api/health`** → 200 JSON.
- **`/api/auth/session`** → POST initData → Supabase JWT + user.
- **`/api/bot/webhook`** → grammY `webhookCallback` with secret-token verification.

## Open Issues / Technical Debt

- `packages/core/src/domain/user.test.ts:99` — redundant `// biome-ignore noExplicitAny`
  after test-file override landed; informational warning only. Fix: remove the comment.
- Lint + build are green; one lint warning is noise.
- `.env.local` duplicates between repo root and `apps/web/` — Next.js reads from `apps/web/`
  for `next build`, but many helper scripts read from root. Acceptable duplication; a
  `symlink` or a loader shim is a Phase 7 cleanup.
- Custom Biome plugin for "no bare strings" + `w-[Npx]` + `layout-safe` comments deferred
  to Phase 6 (D1.10).

## Env Vars Required (by phase)

| Var | Phase | Source |
|---|---|---|
| `NODE_ENV` | 0 | implicit |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 1 | Vercel Supabase Marketplace integration (auto-provisioned) |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET_TOKEN`, `NEXT_PUBLIC_MINI_APP_URL`, `NEXT_PUBLIC_APP_URL` | 1 | BotFather + manual paste into Vercel Project Settings |
| `POSTGRES_URL_NON_POOLING` | 1 (dev) | Supabase Marketplace — used only by `supabase db push --db-url` (scripts), not by runtime |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | 2 | Anthropic console |
| `ESCO_API_BASE` | 3 | default `https://ec.europa.eu/esco/api` |
| `TON_API_KEY`, `TON_NETWORK`, `TON_MANIFEST_URL`, `TON_PAYMENT_RECIPIENT_ADDRESS` | 4 | tonapi.io + self-hosted manifest |
| `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN` | 7 | Sentry console |

## How to Resume From Cold

1. Read `/CLAUDE.md` — rules + cold-boot protocol.
2. Read this file — current state.
3. Read the latest `docs/CHANGELOG.md` entry — what just shipped.
4. Read the latest `docs/SESSION-LOG.md` entry — what was discussed last.
5. Read `.planning/phases/1/verify.md` — proof of Phase 1 outcome.
6. Check `.planning/phases/2/PLAN.md` once `/gsd:plan-phase 2` has run (profile + AI parse).
7. Confirm boot:
   ```bash
   pnpm install
   pnpm dev                # reads apps/web/.env.local
   curl http://localhost:3000/api/health
   ```
8. To apply DB migrations to Supabase Cloud without the Supabase login OAuth step:
   ```bash
   supabase db push --db-url "$POSTGRES_URL_NON_POOLING" --include-all
   ```

## Session Handoff

Latest session narrative lives in `docs/SESSION-LOG.md`. Morning handoff summary of the
autonomous 2026-04-17 night session lives in `.planning/MORNING-SUMMARY.md`.
