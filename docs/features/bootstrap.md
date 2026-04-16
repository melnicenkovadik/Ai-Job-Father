# Feature: Bootstrap & Scaffolding

**Phase:** 0
**Status:** Shipped 2026-04-16
**Owner:** Claude (solo implementation)

## Purpose

Stand up the monorepo, tooling, documentation spine, and CI workflow that every subsequent
phase depends on. After this phase:

- `pnpm dev` runs an empty Next.js app.
- `GET /api/health` returns 200 JSON.
- `packages/core` tests run via Vitest.
- Supabase local dev is ready (config present; `supabase start` requires Docker and is run on
  demand).
- The documentation constitution (CLAUDE.md, PROJECT-MAP, CHANGELOG, SESSION-LOG, ADRs 0001-0003,
  ARCHITECTURE.md) is in place.
- CI pipeline is configured (typecheck + lint + build + unit) — runs on GitHub Actions when the
  repo is pushed.

## What Shipped

### Monorepo layout

- **pnpm 10 workspaces + Turborepo 2**. Three packages:
  - `apps/web` — Next.js 15 App Router (presentation + infrastructure).
  - `packages/core` — framework-free TypeScript (domain + application + ports).
  - `packages/db` — Supabase schema (migrations) + generated types.

### Next.js 15 baseline

- Root `app/layout.tsx` — imports `globals.css`, sets `metadata.title = 'AI Job Bot'`.
- Root `app/page.tsx` — renders `<h1>ai-job-bot</h1>` + a link to `/api/health` with basic
  Tailwind classes.
- `app/api/health/route.ts` — Node runtime Route Handler returning
  `{status, service, commit, ts}` JSON.
- `next.config.ts` — `reactStrictMode`, `typedRoutes`, `typedEnv`, `transpilePackages` for
  workspace packages.

### Styling — Tailwind v4

- `@tailwindcss/postcss` plugin in `postcss.config.mjs`.
- `app/globals.css` uses `@import 'tailwindcss'` + a `@theme` block defining Telegram
  `themeParams` as CSS vars (stubbed with defaults; real runtime binding in Phase 1).
- **No `tailwind.config.ts`** — v4 config lives in CSS, not JS. Creating a legacy config file
  would be misleading.

### TypeScript strict

- `tsconfig.base.json` at repo root:
  - `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`,
    `noImplicitOverride`, `noFallthroughCasesInSwitch`, `isolatedModules`,
    `moduleResolution: 'Bundler'`.
- Packages extend the base; `apps/web` adds `jsx: 'preserve'`, Next plugin, and path aliases.

### Biome 1.9

- Root `biome.json` with `formatter.indentWidth: 2`, single-quoted strings, line width 100.
- Override for `packages/core/**/*.ts` activates `noRestrictedImports` forbidding framework
  imports (Clean Architecture boundary).
- `.next`, `node_modules`, `.turbo`, lockfile, generated types ignored.

### Env validation — `@t3-oss/env-nextjs`

- `apps/web/lib/env.ts` defines a Zod schema covering env vars for Phase 0 through Phase 7.
- Phase 0 requires only `NODE_ENV`. Phase 1+ vars are `.optional()` until their phase lands, at
  which point they become required.
- `SKIP_ENV_VALIDATION=1` escape hatch for CI builds without secrets.

### Testing — Vitest 2

- `packages/core/vitest.config.ts` — Node environment, coverage via v8.
- `packages/core/test/smoke.test.ts` — verifies `CORE_VERSION` export; proves the harness runs.

### Supabase CLI — local-only

- `packages/db/supabase/config.toml` (from `supabase init`, `project_id = "ai-job-bot"`).
- First migration `packages/db/supabase/migrations/20260417000000_init.sql` installs
  `pgcrypto`, `pg_trgm`, `uuid-ossp`. No tables.
- `packages/db/types/generated.ts` placeholder — regenerated after Phase 1 adds the `users`
  table.

### CI — GitHub Actions

- `.github/workflows/ci.yml` triggers on PR to `main` and push to `main`.
- Steps: checkout → pnpm → Node 20 → `pnpm install --frozen-lockfile` → typecheck → lint →
  build (with `SKIP_ENV_VALIDATION=1`) → unit tests.

### Docs spine

- `CLAUDE.md` — 19-section project constitution.
- `README.md` — quickstart for a cold-boot developer.
- `docs/ARCHITECTURE.md` — layer diagram, boundary rules, "how to add a feature" checklist.
- `docs/DECISIONS/0001-nextjs-as-bot-host.md`
- `docs/DECISIONS/0002-supabase-as-shared-db.md`
- `docs/DECISIONS/0003-clean-architecture-layers.md`
- `docs/CHANGELOG.md` — Phase 0 entry.
- `docs/PROJECT-MAP.md` — v0 system map.
- `docs/SESSION-LOG.md` — Phase 0 session narrative.
- This file.

## Data Flow

None at Phase 0. The only runtime flow is `GET /api/health → { status: 'ok', ... }`, which
exists solely to prove the app boots.

## Schema Deltas

Migration `20260417000000_init.sql`:
- `CREATE EXTENSION IF NOT EXISTS pgcrypto` — for `gen_random_uuid()`.
- `CREATE EXTENSION IF NOT EXISTS pg_trgm` — for similarity/fuzzy matching (Phase 3).
- `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"` — fallback.
- No tables.

## UX States

Phase 0 has no UX beyond `/` showing `<h1>ai-job-bot</h1>` + a link to `/api/health`. The point
is to prove the app boots in the browser and that the health endpoint responds.

## Edge Cases

- **Fresh clone, no `.env.local`:** `pnpm install && pnpm dev` must succeed. All Phase 1+
  env vars are `.optional()` in the Zod schema, so boot doesn't fail.
- **`supabase start` without Docker:** fails loudly. Documented in README prerequisites.
- **`supabase db reset`:** idempotent — migration uses `CREATE EXTENSION IF NOT EXISTS`.
- **CI without secrets:** `SKIP_ENV_VALIDATION=1` is passed to the build step so env validation
  is bypassed for build-only checks.

## Open Questions

- GitHub repo: private? public? User deferred the decision — T0.40 was skipped.
- Supabase cloud project region: EU-central Frankfurt recommended for GDPR. Decided in Phase 1
  or 7 when cloud is first needed.

## Related ADRs

- [0001 — Next.js as bot host](../DECISIONS/0001-nextjs-as-bot-host.md)
- [0002 — Supabase as shared DB](../DECISIONS/0002-supabase-as-shared-db.md)
- [0003 — Clean Architecture layers](../DECISIONS/0003-clean-architecture-layers.md)

## Open Follow-ups for Phase 1

- Wire real Telegram `themeParams` → CSS vars via `TelegramProvider`.
- BotFather: create bot, obtain token, set Mini App URL.
- First real migration: `users` table with RLS + our own JWT-claim-based `auth.uid()` bridge.
- Regenerate `packages/db/types/generated.ts` after the `users` migration.
- Activate Biome i18n rule (no bare user-facing strings) once `next-intl` is wired.
- Activate `server-only` Biome enforcement once `apps/web/lib/supabase/server.ts` exists.
- Activate TDD paired-test Biome rule once first real domain entity lands.
