# Changelog

All notable changes per phase. Append-only. One section per phase.

## Phase 1 — Bot + Mini App skeleton + auth (2026-04-17 → in progress)

**Observable outcome:** `/start` → Mini App opens → localized greeting renders → `users` row
upserted on first auth call. Responsive UI Contract primitives shipped with dev-only
`/ui-contract` fixture. Bot commands registered (handlers live; BotFather + webhook register
are user-gated checkpoints).

### Added

**Core domain + application** (TDD, `packages/core`):
- `domain/user.ts` — `User` entity + `TelegramId` / `UserId` value objects.
- `domain/locale.ts` — `Locale` type, `SUPPORTED_LOCALES`, `detectLocale()` (strips region,
  lowercases, falls back to `en`).
- `application/upsert-user.ts` + `ports/user-repo.ts` — use case + port.
- Tests: 12 user + 19 locale + 7 upsertUser cases (38 tests, all green).

**Infrastructure adapters** (`apps/web/lib`):
- `lib/telegram/verify-init-data.ts` — HMAC-SHA256 verifier; 12 test cases.
- `lib/telegram/session.ts` — `resolveSession(raw)` — verify → upsert → sign JWT.
- `lib/telegram/bot.ts` — grammY Bot singleton + `/start /new /profile /status /help`
  handlers + `setMyCommands` on startup.
- `lib/telegram/auth-middleware.ts` — `requireAuth(maxAgeSeconds)` wrapper for API routes.
- `lib/auth/jwt.ts` — `signSupabaseJwt` via `jose` HS256; 5 test cases.
- `lib/supabase/server.ts` — service-role client (server-only).
- `lib/supabase/browser.ts` — browser client + `applySupabaseJwt`.
- `lib/supabase/user-repo.ts` — `SupabaseUserRepo` adapter (4 integration tests, auto-skip
  when Supabase unreachable).

**API routes**:
- `app/api/bot/webhook/route.ts` — grammY webhookCallback + `X-Telegram-Bot-Api-Secret-Token`
  verification.
- `app/api/auth/session/route.ts` — initData → Supabase JWT.
- `scripts/set-webhook.ts` — one-shot webhook registration with secret token.

**Database**:
- Migration `20260418000000_users.sql` — `public.users` table (telegram_id UNIQUE, locale
  default 'en', timestamps, `set_updated_at` trigger).
- Migration `20260418000100_users_rls.sql` — RLS on, policies `users_self_read` +
  `users_self_update` keyed on `auth.uid() = id`. Service-role bypasses RLS for inserts.
- **Applied to Supabase Cloud** (project `fixvzokjvqgqyzdidabo`, eu-central-2).

**Responsive UI Contract primitives** (`apps/web/components/ui/layout/`):
- `<Screen reserveMainButton>` — viewport var + safe-area + 96px MainButton reserve.
- `<Stack gap>` / `<Row gap>` — `min-w-0`, gap-only, typed `Gap` = 0|1|2|3|4|6|8.
- `<Section title>` — titled block with consistent rhythm.
- `<Scroll>` — the sole owner of `overflow-y: auto` in the system.
- `<HScroll>` — horizontal scroller with snap for pill rails.
- `<FieldGroup label hint error>` — label/input/hint/error form row with overflow-wrap.
- `<Clamp lines={N}>` — CSS line-clamp.
- Barrel `index.ts` exports all eight.

**Telegram Mini App integration** (`apps/web/components/telegram/`):
- `webapp.ts` — typed `window.Telegram.WebApp` accessor, graceful undefined fallback.
- `theme-bridge.tsx` — copies `themeParams` + viewport events into CSS variables on
  `<html>`; re-applies on `themeChanged` / `viewportChanged`.
- `auth-gate.tsx` — client mutation `initData → /api/auth/session → applySupabaseJwt`,
  with localised bootstrap / missing / pending / error / ready render states + Retry.
- `provider.tsx` — composes `QueryClientProvider` + `ThemeBridge` + `AuthGate`, calls
  `Telegram.WebApp.ready() + .expand()` on mount.
- `lib/query-client.ts` — TanStack Query v5 factory (SSR-safe singleton pattern).
- `lib/auth/use-session.ts` — read-only view of `['session']` query cache via
  `useSyncExternalStore`.

**Route groups**:
- `app/(app)/layout.tsx` — RSC shell loading messages, wrapping in
  `NextIntlClientProvider` + `TelegramProvider`.
- `app/(app)/page.tsx` — client greeting using `useSession()` + `useTranslations('home')`.
- `app/(dev)/layout.tsx` — bare dev shell for Playwright fixtures.
- `app/(dev)/ui-contract/page.tsx` — exercises all 8 primitives with worst-case content
  (RU-long, AI-token, 12-item HScroll rail, FieldGroup hint+error).

**i18n** (`apps/web/messages/`):
- 5 locale files: `en.json` (real), `uk.json`, `ru.json`, `it.json`, `pl.json`
  (`[LOCALE] ...` placeholders).
- `apps/web/app/i18n/request.ts` — locale priority: cookie → Accept-Language → `en`.
- `apps/web/components/i18n/LocaleSwitcher.tsx` — dev-only 5-button switcher.
- `apps/web/middleware.ts` — minimal locale-passthrough.
- `messages-parity.test.ts` — 2 tests ensuring symmetric key trees across 5 locales.

**Docs + ADRs**:
- `docs/features/auth-skeleton.md`, `ui-contract.md`, `i18n-skeleton.md`, `bot-commands.md`.
- `docs/DECISIONS/0004-telegram-initdata-auth.md` — HMAC + short JWT vs Supabase
  Auth / OAuth / cookies.
- `docs/DECISIONS/0005-responsive-ui-contract.md` — 8 primitives + visual regression vs
  per-PR audits or Storybook.

### Changed

- `biome.json` — added test-file override allowing `noNonNullAssertion`, `noDelete`,
  `noExplicitAny` (test fixtures use typed tuples and shape casts deliberately).
- Workspace-wide import sort via `biome check --fix` (no behaviour change).
- `CLAUDE.md` — expanded §6 (i18n manual review), §7 (auth + webhook secret rules), §18
  (Phase 0 + 1 marked shipped; Phase 3 now 3-screen per approved compression plan),
  §19 (Quick Reference adds primitive composition), added §20 Responsive UI Contract.
- Root `app/page.tsx` removed — `/` now served by `app/(app)/page.tsx` under the Mini App
  layout (TelegramProvider + NextIntl).

### Applied to Supabase Cloud

- Project `fixvzokjvqgqyzdidabo` (eu-central-2) created + wired via Vercel Marketplace.
- `supabase db push` applied the three pending migrations (init, users, users_rls).
- `public.users` + both RLS policies verified via `\d public.users` +
  `pg_policies` query.

### Deferred to user checkpoints (Wave K — Phase 1 verify)

- **BotFather menu button** — user action (`/setmenubutton` with Vercel URL).
- **Production webhook registration** — `pnpm tsx scripts/set-webhook.ts` with prod URL,
  runnable once Vercel URL is final.
- **Real device flow (T1.65)** — `/start` from phone, screenshot greeting + verified
  `users` row. Needs the above two.

### Deferred to Phase 6

- Real UK/RU/IT/PL translations (placeholders with `[LOCALE]` prefix until then).
- Custom Biome plugin for "no bare strings" + `w-[Npx]` + `layout-safe` comment
  enforcement (D1.10 — manual review until Phase 6).
- Full 18-screenshot visual regression matrix (3 viewports × 2 themes × 3 locales).

### Notes

- **Supabase Cloud is now live** — local Docker path documented but unused; `.env.local`
  points at Cloud URL + keys for development.
- **Wizard plan compressed** — 8-step wizard (per base plan) approved for compression to
  3-screen layout with progressive-disclosure advanced sections (see
  `~/.claude/plans/lucky-noodling-pike.md`). Data contract (snapshot v1, ESCO, immutability
  trigger) unchanged.
- `pnpm -w lint` green (1 informational warning in `packages/core/src/domain/user.test.ts`
  about a redundant suppression comment — not a regression).
- `SKIP_ENV_VALIDATION=1` is no longer needed for local `pnpm build` once
  `apps/web/.env.local` exists (Next.js reads it automatically).

---

## Phase 0 — Bootstrap & scaffolding (2026-04-16, shipped)

**Observable outcome:** `pnpm dev` runs empty Next.js app, `GET /api/health` returns 200,
CI configured, Supabase scaffolded locally (cloud link deferred), layer boundaries enforced.

### Added
- Monorepo: pnpm 10 workspaces + Turborepo 2 (`apps/web`, `packages/core`, `packages/db`).
- Next.js 15 App Router baseline: minimal root layout, landing page at `/`, health endpoint at
  `/api/health` (Node runtime, returns JSON `{status, service, commit, ts}`).
- Tailwind v4 via `@tailwindcss/postcss`. `@theme` block in `apps/web/app/globals.css` binds
  Telegram `themeParams` as CSS vars (stubbed; real runtime binding in Phase 1).
- TypeScript 5.7 strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `noImplicitOverride`) shared via `tsconfig.base.json`.
- Biome 1.9 with layer-boundary `noRestrictedImports` on `packages/core/**/*.ts` forbidding
  `next`, `react`, `@supabase/*`, `@anthropic-ai/sdk`, `grammy`, `@tonconnect/*`,
  `@telegram-apps/*`.
- `@t3-oss/env-nextjs` + Zod schema covering env vars across all 8 phases (Phase 1+ vars
  `.optional()` until wired).
- Vitest 2 in `packages/core` with a smoke test proving the harness works.
- Supabase CLI local config: `packages/db/supabase/config.toml` (via `supabase init`) +
  first migration `20260417000000_init.sql` creating `pgcrypto`, `pg_trgm`, `uuid-ossp`
  extensions. No tables yet.
- `packages/db/types/generated.ts` placeholder (regenerated in Phase 1 after first table
  migration).
- GitHub Actions CI: typecheck + lint + build + unit tests on PR and main.
- Documentation spine:
  - `CLAUDE.md` (root constitution, 19 sections, 200+ lines)
  - `README.md` (quickstart, prereqs, workspace layout)
  - `docs/ARCHITECTURE.md` (layers, diagram, data flow, 8-step feature checklist)
  - `docs/DECISIONS/0001-nextjs-as-bot-host.md`
  - `docs/DECISIONS/0002-supabase-as-shared-db.md`
  - `docs/DECISIONS/0003-clean-architecture-layers.md`
  - `docs/CHANGELOG.md` (this file)
  - `docs/PROJECT-MAP.md` (v0)
  - `docs/SESSION-LOG.md` (Phase 0 entry)
  - `docs/features/bootstrap.md`

### Removed
- Empty `fe/` placeholder directory (replaced by `apps/web`).

### Deferred
- **`supabase start`** — requires Docker daemon; user can start it manually when needed.
  Phase 0 only needs `supabase init` + the migration file, which work without Docker.
- **Supabase cloud project** — needs account + region + paid-tier decision. Deferred to
  Phase 1 (when bot webhook needs a public URL) or Phase 7 (production).
- **GitHub repo creation (T0.40)** — keeping local for now per user instruction. Will be
  revisited at Phase 7 or on explicit user request.
- **`tailwind.config.ts`** — Tailwind v4 does not require a JS config; everything lives in the
  CSS `@theme` block. Plan mentioned creating one but we chose the v4 idiom instead.
- **Biome `server-only` enforcement rule** — declared as TODO; activates in Phase 1 when
  `apps/web/lib/supabase/server.ts` appears.
- **TDD paired-test Biome rule** — same; activates in Phase 1 when first real domain entity lands.
- **i18n lint rule** (no bare strings) — activates in Phase 1 when `next-intl` is wired.

### Notes
- pnpm 10 used (plan originally said 9); user's local tooling is 10 and lockfile is 10-flavored.
  Documented in CLAUDE.md §14.
