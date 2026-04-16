# Changelog

All notable changes per phase. Append-only. One section per phase.

## Phase 0 — Bootstrap & scaffolding (2026-04-16 → in progress)

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
