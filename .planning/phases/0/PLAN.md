---
phase: 0
phase_name: Bootstrap & Scaffolding
kind: infra
observable_outcome: "`pnpm dev` runs empty Next.js app, `GET /api/health` returns 200, CI green, Supabase linked (or scaffolded locally if cloud creation deferred)."
authoritative_refs:
  - ~/.claude/plans/effervescent-wibbling-breeze.md
  - .planning/PROJECT.md
  - .planning/REQUIREMENTS.md
  - .planning/ROADMAP.md
  - .planning/config.json
commit_style: conventional
total_tasks: 41
---

# Phase 0 — Bootstrap & Scaffolding (PLAN)

> **What this plan does:** stands up the monorepo skeleton (pnpm workspaces + Turborepo), Next.js 15 app with health endpoint, Tailwind v4, Biome with layer-boundary rules, TS strict, `@t3-oss/env-nextjs`, empty Supabase migration, CI workflow, and the full doc spine (CLAUDE.md, README, ARCHITECTURE, 3 ADRs, CHANGELOG, PROJECT-MAP, SESSION-LOG, feature doc).
> **What this plan does NOT do:** no bot token, no auth, no UI primitives, no tables beyond extensions. All that is Phase 1+.
> **Non-negotiable inputs:** TS strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), Biome (not ESLint+Prettier), Tailwind v4 (`@theme` block in CSS), layer boundaries via Biome `noRestrictedImports`, `server-only` for service-role key, Node runtime for API routes.

---

## 0. Prerequisites (verified before planning)

| Tool | Required | Observed | Notes |
|---|---|---|---|
| Node | ≥20 | v20.20.2 | ✅ |
| pnpm | 9+ | 10.18.0 | ✅ (plan said 9; 10 works, update plan refs to "pnpm 10") |
| gh CLI | any | 2.89.0 | ✅ |
| git | any | 2.50.1 | ✅ |
| supabase CLI | latest | **MISSING** | Installed by T0.1 |

---

## 1. Design Decisions Made In Absence Of Explicit Guidance

These are decisions I made while planning — each is reversible, but flagging them so they're visible.

| # | Decision | Alternative | Rationale |
|---|---|---|---|
| D1 | **pnpm 10 (not 9)** | pnpm 9 per plan file | User's machine has 10; downgrading adds friction with zero benefit. CLAUDE.md notes the version. |
| D2 | **Supabase local-only in Phase 0, cloud deferred** | Create cloud project now | User said "Supabase project linked (or scaffolded locally)". Cloud project needs an account decision (paid tier? region?) that isn't in CONTEXT. T0.23 initializes local; creating cloud project deferred to Phase 1 or Phase 7. |
| D3 | **No GitHub repo creation in Phase 0 by default** | Create + push now | Plan says repo creation happens; user's intake didn't confirm private/public or org. T0.40 is gated — only runs if user confirms during execution. Otherwise defer to Phase 7. |
| D4 | **Migration timestamp `20260417000000_init.sql`** | Use today's date | Plan file references `20260417_000001_init.sql`. Current date is 2026-04-16 (before midnight UTC); using the plan's timestamp keeps filenames aligned with existing references. |
| D5 | **`app/page.tsx` = minimal placeholder, not `/(app)/page.tsx`** | Proper route group now | Route groups land in Phase 1 with TelegramProvider. Phase 0's page is literally `<h1>ai-job-bot</h1>` proving the app boots. |
| D6 | **Turbo 2, not 3** | Latest | Turbo 3 is very new (changed config shape). Turbo 2 matches the plan file and is stable. |
| D7 | **tsconfig.base.json at repo root** | Per-package tsconfigs only | Shared strict settings need one source; package tsconfigs `extend` it. Standard monorepo pattern. |
| D8 | **Biome layer rules at root `biome.json`, not per-package** | Per-package | Layer boundary rules cross package lines (core forbids next/react) — root is the correct scope. Per-package `biome.json` only needed if a package diverges, which none do yet. |
| D9 | **`.env.example` lists ALL env vars planned across all phases** | Only Phase 0 vars | `@t3-oss/env-nextjs` validates at boot. Declaring all known keys with `server`/`client` split now prevents silent drift. Vars not yet used are documented as `# phase: N — description`. |
| D10 | **No `scripts/` directory in Phase 0** | Create `scripts/set-webhook.ts` stub | That script belongs to Phase 1 (bot registration). Creating it empty is dead code. |
| D11 | **Placeholder `packages/db/types/generated.ts` contains a single `export type Database = { /* regen after first migration */ };`** | Leave empty or run gen against empty schema | File must exist so package imports don't break. Regenerated in Phase 1 after the first real table migration. |
| D12 | **Vitest only wired into `packages/core` in Phase 0** | Wire `apps/web` too | Phase 0 has nothing to test in `apps/web`. Adding Vitest config there is Phase 1 work when the first unit test appears. |
| D13 | **CI job matrix: typecheck + lint + build + unit** | Also E2E + visual | No routes/UI exist yet. E2E & visual regression wired in Phase 1 when first screen ships. |

---

## 2. Task List (41 tasks, ordered with dependencies)

Format:
- **ID** · **Title**
- **Files**: absolute paths created/modified
- **Action**: what to do (concrete)
- **Verify**: how to confirm done
- **Commit**: conventional commit message template
- **Depends on**: prior task IDs (parallelizable if only depends on common ancestors)

---

### T0.1 · Install Supabase CLI

- **Files**: none (host tool)
- **Action**: run `brew install supabase/tap/supabase`
- **Verify**: `supabase --version` prints a version ≥ 1.200
- **Commit**: (no commit — tooling install)
- **Depends on**: none

---

### T0.2 · Remove empty `fe/` directory

- **Files**: delete `/Users/vadymmelnychenko/Projects/ai-job-bot/fe/`
- **Action**: `rmdir /Users/vadymmelnychenko/Projects/ai-job-bot/fe` (verify empty first; fail loudly if not empty)
- **Verify**: `ls /Users/vadymmelnychenko/Projects/ai-job-bot/` does not show `fe`
- **Commit**: `chore: remove placeholder fe/ directory (replaced by apps/web)`
- **Depends on**: none

---

### T0.3 · Root `package.json` (pnpm workspaces + turbo + scripts)

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/package.json`
- **Action**: create with:
  - `"name": "ai-job-bot"`, `"private": true`, `"packageManager": "pnpm@10.18.0"`
  - `"engines": { "node": ">=20" }`
  - workspace-level scripts: `dev`, `build`, `typecheck`, `lint`, `format`, `test`, `test:unit`, `clean` — all delegating to turbo
  - devDependencies: `turbo@^2.3.0`, `@biomejs/biome@^1.9.4`, `typescript@^5.7.0`, `@types/node@^20`
- **Verify**: file valid JSON; `pnpm -w run` lists the scripts
- **Commit**: `chore: add root package.json with workspace scripts`
- **Depends on**: T0.2

---

### T0.4 · `pnpm-workspace.yaml`

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/pnpm-workspace.yaml`
- **Action**: create with:
  ```yaml
  packages:
    - "apps/*"
    - "packages/*"
  ```
- **Verify**: `pnpm -r list --depth -1` (after install later) enumerates apps/web, packages/core, packages/db
- **Commit**: `chore: add pnpm workspace manifest`
- **Depends on**: T0.3 (independent logically, but group commits)

---

### T0.5 · `turbo.json`

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/turbo.json`
- **Action**: create Turbo 2 config with pipelines:
  - `build` — depends on `^build`, outputs `.next/**`, `dist/**`
  - `dev` — `cache: false`, `persistent: true`
  - `typecheck` — depends on `^typecheck`, outputs none
  - `lint` — outputs none
  - `test` and `test:unit` — outputs none, depends on `^build`
  - `clean` — `cache: false`
  - Global env: `NODE_ENV`
- **Verify**: `pnpm exec turbo run --help` accepts the config (syntax check)
- **Commit**: `chore: configure turborepo pipelines`
- **Depends on**: T0.3

---

### T0.6 · Root `biome.json` with layer-boundary `noRestrictedImports`

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/biome.json`
- **Action**: create Biome 1.9 config:
  - formatter: 2-space indent, line width 100, semicolons `always`
  - linter: recommended on
  - `javascript.formatter.quoteStyle: "single"`
  - `json.formatter.trailingCommas: "none"`
  - `files.ignore`: `.next`, `node_modules`, `.turbo`, `dist`, `.vercel`, `playwright-report`, `test-results`, `supabase/.temp`
  - `overrides` for `packages/core/**/*.ts` with rule `noRestrictedImports` forbidding: `next`, `next/*`, `react`, `react-dom`, `@supabase/*`, `@anthropic-ai/sdk`, `grammy`, `@tonconnect/*`, `@telegram-apps/*`
  - `overrides` for `apps/web/**/*.{ts,tsx}` enabling `server-only` import enforcement rule (TBD — marked TODO, to be activated in Phase 1 when service-role client appears; Phase 0 just declares the override block with a comment)
- **Verify**: `pnpm exec biome check /Users/vadymmelnychenko/Projects/ai-job-bot/biome.json` returns no config errors
- **Commit**: `chore: configure biome with layer-boundary rules`
- **Depends on**: T0.3

---

### T0.7 · Root `tsconfig.base.json` (strict config)

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/tsconfig.base.json`
- **Action**: create with:
  - `target: "ES2022"`, `module: "ESNext"`, `moduleResolution: "Bundler"`
  - `strict: true`
  - `noUncheckedIndexedAccess: true`
  - `exactOptionalPropertyTypes: true`
  - `noImplicitReturns: true`, `noFallthroughCasesInSwitch: true`, `noImplicitOverride: true`
  - `isolatedModules: true`, `esModuleInterop: true`, `skipLibCheck: true`, `forceConsistentCasingInFileNames: true`
  - `resolveJsonModule: true`, `verbatimModuleSyntax: true`
  - `lib: ["ES2022", "DOM", "DOM.Iterable"]`
- **Verify**: JSON valid; `pnpm exec tsc -p /Users/vadymmelnychenko/Projects/ai-job-bot/tsconfig.base.json --showConfig` prints the resolved config
- **Commit**: `chore: add root tsconfig.base.json with strict TS settings`
- **Depends on**: T0.3

---

### T0.8 · `.env.example` (all env vars planned)

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/.env.example`
- **Action**: create with all env keys from the plan, grouped by phase, each with a `# phase: N` comment and a placeholder value (never a real secret):
  - Phase 0: `NODE_ENV`
  - Phase 1: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`
  - Phase 2: `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` (default `claude-sonnet-4-5`)
  - Phase 3: `ESCO_API_BASE` (default `https://ec.europa.eu/esco/api`)
  - Phase 4: `TON_API_KEY`, `TON_NETWORK` (testnet/mainnet), `NEXT_PUBLIC_TONCONNECT_MANIFEST_URL`
  - Phase 7: `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `VERCEL_URL`
- **Verify**: file exists; each variable has placeholder value and a phase comment
- **Commit**: `chore: add .env.example with all planned env vars`
- **Depends on**: T0.3

---

### T0.9 · `.gitignore`

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/.gitignore`
- **Action**: create with:
  ```
  node_modules
  .next
  .turbo
  dist
  .vercel
  .env
  .env.local
  .env.*.local
  supabase/.temp
  supabase/.branches
  playwright-report
  test-results
  *.log
  .DS_Store
  coverage
  .tsbuildinfo
  ```
- **Verify**: file exists; `git status` does not show `.env` or `node_modules` after install
- **Commit**: `chore: add gitignore`
- **Depends on**: T0.3

---

### T0.10 · `apps/web/package.json`

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/package.json`
- **Action**: create with:
  - `"name": "@ai-job-bot/web"`, `"private": true`, `"type": "module"`
  - scripts: `dev: "next dev"`, `build: "next build"`, `start: "next start"`, `typecheck: "tsc --noEmit"`, `lint: "biome check ."`
  - dependencies:
    - `next@^15.1.0`
    - `react@^19.0.0`, `react-dom@^19.0.0`
    - `@t3-oss/env-nextjs@^0.11.0`, `zod@^3.23.0`
    - `server-only@^0.0.1`
  - devDependencies:
    - `@types/react@^19`, `@types/react-dom@^19`
    - `typescript@^5.7.0`
    - `tailwindcss@^4.0.0`, `@tailwindcss/postcss@^4.0.0`, `postcss@^8`
- **Verify**: file valid JSON; versions pinned to caret-minor
- **Commit**: `feat(web): add apps/web package manifest`
- **Depends on**: T0.3, T0.4

---

### T0.11 · `apps/web/next.config.ts`

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/next.config.ts`
- **Action**: create a minimal Next.js 15 config:
  ```ts
  import type { NextConfig } from "next";

  const nextConfig: NextConfig = {
    reactStrictMode: true,
    typedRoutes: true,
    experimental: {
      typedEnv: true,
    },
  };

  export default nextConfig;
  ```
  Do NOT set `runtime: 'edge'` — API routes need Node runtime for grammY (Phase 1).
- **Verify**: file type-checks against Next 15 types
- **Commit**: `feat(web): add next.config.ts (node runtime default)`
- **Depends on**: T0.10

---

### T0.12 · `apps/web/tsconfig.json` (extends base)

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/tsconfig.json`
- **Action**: create:
  ```json
  {
    "extends": "../../tsconfig.base.json",
    "compilerOptions": {
      "jsx": "preserve",
      "plugins": [{ "name": "next" }],
      "baseUrl": ".",
      "paths": {
        "@/*": ["./*"],
        "@ai-job-bot/core": ["../../packages/core/src/index.ts"],
        "@ai-job-bot/core/*": ["../../packages/core/src/*"],
        "@ai-job-bot/db": ["../../packages/db/types/generated.ts"]
      }
    },
    "include": [
      "next-env.d.ts",
      "**/*.ts",
      "**/*.tsx",
      ".next/types/**/*.ts"
    ],
    "exclude": ["node_modules", ".next"]
  }
  ```
- **Verify**: `pnpm --filter @ai-job-bot/web exec tsc --showConfig` resolves paths correctly
- **Commit**: `feat(web): add tsconfig with strict inheritance + path aliases`
- **Depends on**: T0.7, T0.10

---

### T0.13 · `apps/web/app/layout.tsx` + `app/page.tsx` (minimal)

- **Files**:
  - `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/app/layout.tsx`
  - `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/app/page.tsx`
- **Action**:
  - `layout.tsx`: RSC, imports `./globals.css`, `<html lang="en"><body>{children}</body></html>`, sets `metadata.title = 'AI Job Bot'`
  - `page.tsx`: RSC, returns a `<main>` with an `<h1>ai-job-bot</h1>` and a `<p>` linking to `/api/health`. Styled with basic Tailwind classes to prove Tailwind works.
- **Verify**: `pnpm --filter @ai-job-bot/web dev` renders the page at `http://localhost:3000`
- **Commit**: `feat(web): add minimal root layout and landing page`
- **Depends on**: T0.11, T0.12, T0.16

---

### T0.14 · `apps/web/app/api/health/route.ts`

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/app/api/health/route.ts`
- **Action**: create Route Handler:
  ```ts
  export const runtime = 'nodejs';
  export const dynamic = 'force-dynamic';

  export function GET() {
    return Response.json({
      status: 'ok',
      service: 'ai-job-bot-web',
      commit: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local',
      ts: new Date().toISOString(),
    });
  }
  ```
- **Verify**: `curl http://localhost:3000/api/health` returns 200 with valid JSON
- **Commit**: `feat(web): add /api/health endpoint`
- **Depends on**: T0.12

---

### T0.15 · `apps/web/tailwind.config.ts` (Tailwind v4 with placeholder themeParams CSS vars)

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/tailwind.config.ts`
- **Action**: create minimal Tailwind v4 config (mostly a content-glob declaration since v4 does everything via CSS `@theme`):
  ```ts
  import type { Config } from 'tailwindcss';

  export default {
    content: [
      './app/**/*.{ts,tsx}',
      './components/**/*.{ts,tsx}',
      './features/**/*.{ts,tsx}',
    ],
  } satisfies Config;
  ```
  The real `@theme` block lives in `globals.css` (T0.16). This config file exists mostly for tooling that expects it.
- **Verify**: `pnpm --filter @ai-job-bot/web build` does not error on missing content paths
- **Commit**: `feat(web): add tailwind v4 config (content globs only)`
- **Depends on**: T0.10

---

### T0.16 · `apps/web/app/globals.css` (Tailwind v4 import + @theme + reset)

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/app/globals.css`
- **Action**: create with:
  ```css
  @import "tailwindcss";

  @theme {
    /* Telegram themeParams (stubbed — real values bound at runtime in Phase 1) */
    --color-bg: var(--tg-theme-bg-color, #ffffff);
    --color-text: var(--tg-theme-text-color, #000000);
    --color-hint: var(--tg-theme-hint-color, #707579);
    --color-link: var(--tg-theme-link-color, #2481cc);
    --color-button: var(--tg-theme-button-color, #2481cc);
    --color-button-text: var(--tg-theme-button-text-color, #ffffff);
    --color-secondary-bg: var(--tg-theme-secondary-bg-color, #f4f4f5);

    /* Viewport binding (set in Phase 1 via TelegramProvider) */
    --tg-viewport-height: 100vh;
    --tg-viewport-stable-height: 100vh;
    --mainbtn-h: 0px;
  }

  @layer base {
    html, body { margin: 0; padding: 0; background: var(--color-bg); color: var(--color-text); }
    body { overflow-x: hidden; }
  }
  ```
- **Verify**: build succeeds; inspecting compiled CSS shows the `@theme` vars
- **Commit**: `feat(web): add tailwind v4 globals.css with telegram themeParams stubs`
- **Depends on**: T0.10

---

### T0.17 · `apps/web/lib/env.ts` (`@t3-oss/env-nextjs` + Zod schema)

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/lib/env.ts`
- **Action**: create t3-env module covering **only** vars actually referenced in Phase 0 code (health endpoint references none; NODE_ENV is implicit). Stub out all Phase 1+ vars with `.optional()` for now:
  ```ts
  import { createEnv } from '@t3-oss/env-nextjs';
  import { z } from 'zod';

  export const env = createEnv({
    server: {
      NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
      // Phase 1+ — optional until wired
      SUPABASE_URL: z.string().url().optional(),
      SUPABASE_ANON_KEY: z.string().optional(),
      SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
      SUPABASE_JWT_SECRET: z.string().optional(),
      TELEGRAM_BOT_TOKEN: z.string().optional(),
      TELEGRAM_WEBHOOK_SECRET: z.string().optional(),
      ANTHROPIC_API_KEY: z.string().optional(),
      ANTHROPIC_MODEL: z.string().default('claude-sonnet-4-5'),
      ESCO_API_BASE: z.string().url().default('https://ec.europa.eu/esco/api'),
      TON_API_KEY: z.string().optional(),
      TON_NETWORK: z.enum(['testnet', 'mainnet']).default('testnet'),
      SENTRY_DSN: z.string().optional(),
    },
    client: {
      NEXT_PUBLIC_APP_URL: z.string().url().optional(),
      NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
      NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
      NEXT_PUBLIC_TONCONNECT_MANIFEST_URL: z.string().url().optional(),
    },
    runtimeEnv: {
      NODE_ENV: process.env.NODE_ENV,
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET,
      TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
      TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL,
      ESCO_API_BASE: process.env.ESCO_API_BASE,
      TON_API_KEY: process.env.TON_API_KEY,
      TON_NETWORK: process.env.TON_NETWORK,
      SENTRY_DSN: process.env.SENTRY_DSN,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
      NEXT_PUBLIC_TONCONNECT_MANIFEST_URL: process.env.NEXT_PUBLIC_TONCONNECT_MANIFEST_URL,
    },
    emptyStringAsUndefined: true,
    skipValidation: process.env.SKIP_ENV_VALIDATION === '1',
  });
  ```
  All `.optional()` will be upgraded to required in the phase that uses them.
- **Verify**: `pnpm --filter @ai-job-bot/web typecheck` passes with no errors even when only `NODE_ENV` is set
- **Commit**: `feat(web): add t3-env boot-time validation with zod`
- **Depends on**: T0.10, T0.12

---

### T0.18 · `packages/core/package.json`

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/packages/core/package.json`
- **Action**: create:
  - `"name": "@ai-job-bot/core"`, `"private": true`, `"type": "module"`, `"version": "0.0.1"`
  - `"main": "./src/index.ts"`, `"types": "./src/index.ts"` (monorepo-local — no build step, consumed via path alias)
  - scripts: `typecheck: "tsc --noEmit"`, `test: "vitest run"`, `test:watch: "vitest"`, `lint: "biome check src"`
  - dependencies: `zod@^3.23.0` (pure-TS libs only — Biome rule will block `next`/`react`/`@supabase/*` even if accidentally added)
  - devDependencies: `vitest@^2.1.0`, `@vitest/coverage-v8@^2.1.0`, `typescript@^5.7.0`, `fast-check@^3.22.0`
- **Verify**: file valid JSON; importing from `apps/web` via `@ai-job-bot/core` resolves after `pnpm install`
- **Commit**: `feat(core): add @ai-job-bot/core package manifest`
- **Depends on**: T0.3, T0.4

---

### T0.19 · `packages/core/tsconfig.json`

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/packages/core/tsconfig.json`
- **Action**: create:
  ```json
  {
    "extends": "../../tsconfig.base.json",
    "compilerOptions": {
      "rootDir": "./src",
      "outDir": "./dist",
      "noEmit": true,
      "types": ["node"]
    },
    "include": ["src/**/*", "test/**/*"],
    "exclude": ["node_modules", "dist"]
  }
  ```
- **Verify**: `pnpm --filter @ai-job-bot/core typecheck` passes on empty index
- **Commit**: `feat(core): add tsconfig extending strict base`
- **Depends on**: T0.7, T0.18

---

### T0.20 · `packages/core/src/index.ts` + empty `domain/` + `application/` folders

- **Files**:
  - `/Users/vadymmelnychenko/Projects/ai-job-bot/packages/core/src/index.ts`
  - `/Users/vadymmelnychenko/Projects/ai-job-bot/packages/core/src/domain/.gitkeep`
  - `/Users/vadymmelnychenko/Projects/ai-job-bot/packages/core/src/application/.gitkeep`
  - `/Users/vadymmelnychenko/Projects/ai-job-bot/packages/core/src/application/ports/.gitkeep`
- **Action**:
  - `src/index.ts` exports a single placeholder: `export const CORE_VERSION = '0.0.1';`
  - `.gitkeep` files so the layer directories exist in version control
- **Verify**: `typecheck` passes; directory structure matches Clean Architecture layers (domain / application / application/ports)
- **Commit**: `feat(core): scaffold domain/application layer directories`
- **Depends on**: T0.19

---

### T0.21 · `packages/core/vitest.config.ts` + sample test

- **Files**:
  - `/Users/vadymmelnychenko/Projects/ai-job-bot/packages/core/vitest.config.ts`
  - `/Users/vadymmelnychenko/Projects/ai-job-bot/packages/core/test/smoke.test.ts`
  - `/Users/vadymmelnychenko/Projects/ai-job-bot/packages/core/test/.gitkeep` (if not filled)
- **Action**:
  - `vitest.config.ts`:
    ```ts
    import { defineConfig } from 'vitest/config';

    export default defineConfig({
      test: {
        include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
        environment: 'node',
        coverage: { provider: 'v8', reporter: ['text', 'lcov'] },
      },
    });
    ```
  - `test/smoke.test.ts`:
    ```ts
    import { describe, it, expect } from 'vitest';
    import { CORE_VERSION } from '../src';

    describe('core', () => {
      it('exports CORE_VERSION', () => {
        expect(CORE_VERSION).toBe('0.0.1');
      });
    });
    ```
- **Verify**: `pnpm --filter @ai-job-bot/core test` prints `1 passed`
- **Commit**: `test(core): add vitest config + smoke test`
- **Depends on**: T0.20

---

### T0.22 · `packages/db/package.json`

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/packages/db/package.json`
- **Action**: create:
  - `"name": "@ai-job-bot/db"`, `"private": true`, `"type": "module"`, `"version": "0.0.1"`
  - `"main": "./types/generated.ts"`, `"types": "./types/generated.ts"`
  - scripts:
    - `db:start: "supabase start"`
    - `db:stop: "supabase stop"`
    - `db:status: "supabase status"`
    - `db:reset: "supabase db reset"`
    - `db:migrate: "supabase migration up"`
    - `db:gen-types: "supabase gen types typescript --local > types/generated.ts"`
    - `typecheck: "tsc --noEmit"`
    - `lint: "biome check ."`
  - devDependencies: `supabase@^1.200.0` (npm shim for CLI), `typescript@^5.7.0`
- **Verify**: file valid JSON; `pnpm --filter @ai-job-bot/db run` lists scripts
- **Commit**: `feat(db): add @ai-job-bot/db package manifest`
- **Depends on**: T0.1, T0.3, T0.4

---

### T0.23 · `packages/db/supabase/config.toml`

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/packages/db/supabase/config.toml`
- **Action**:
  - Run `cd /Users/vadymmelnychenko/Projects/ai-job-bot/packages/db && supabase init` (which generates `config.toml` + empty `migrations/` + `seed.sql`)
  - Edit `config.toml`:
    - `project_id = "ai-job-bot"`
    - enable `[auth]` but note: we're NOT using Supabase Auth in the app (Telegram is IdP). Auth is enabled only because some tables will eventually reference `auth.users` for RLS `auth.uid()` — actually NO, we use our own `users` table. Keep `auth` default settings; our RLS will key off a custom JWT claim.
    - `[api]` port default 54321
    - `[db]` port default 54322, `major_version = 15`
  - Also ensure `packages/db/supabase/seed.sql` exists (empty or with a comment) — created by `supabase init`
- **Verify**: `cd packages/db && supabase start` launches local Postgres + API; `supabase status` shows "Started"
- **Commit**: `feat(db): supabase local dev config (no cloud link yet)`
- **Depends on**: T0.22

---

### T0.24 · `packages/db/supabase/migrations/20260417000000_init.sql`

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/packages/db/supabase/migrations/20260417000000_init.sql`
- **Action**: create the first migration with schema extensions and placeholder comment (NO tables yet — tables are Phase 1+):
  ```sql
  -- ============================================================================
  -- AI Job Bot — initial migration (Phase 0 scaffolding)
  -- Establishes extensions used across subsequent migrations.
  -- Tables land in Phase 1 (users), Phase 2 (profiles), Phase 3 (campaigns + esco_cache),
  -- Phase 4 (payments), Phase 5 (notifications).
  -- ============================================================================

  create extension if not exists "pgcrypto";   -- gen_random_uuid()
  create extension if not exists "pg_trgm";    -- text similarity (dedup, esco search)
  create extension if not exists "uuid-ossp";  -- belt-and-suspenders

  -- No tables in this migration.
  -- This file exists so `supabase db reset` has a migration to apply and
  -- `supabase gen types` can produce a valid (empty) Database type.
  ```
- **Verify**: `cd packages/db && supabase db reset` applies the migration without error
- **Commit**: `feat(db): init migration with pgcrypto + pg_trgm extensions`
- **Depends on**: T0.23

---

### T0.25 · `packages/db/types/generated.ts` (placeholder)

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/packages/db/types/generated.ts`
- **Action**: create a placeholder file with a single export so imports don't break:
  ```ts
  // Auto-generated by `supabase gen types typescript --local`.
  // Regenerate after every migration.
  // Phase 0: placeholder — no tables yet.

  export type Database = {
    public: {
      Tables: Record<string, never>;
      Views: Record<string, never>;
      Functions: Record<string, never>;
      Enums: Record<string, never>;
      CompositeTypes: Record<string, never>;
    };
  };
  ```
- **Verify**: `pnpm --filter @ai-job-bot/db typecheck` passes; `pnpm --filter @ai-job-bot/web typecheck` succeeds when it eventually imports `Database` from `@ai-job-bot/db`
- **Commit**: `feat(db): add types/generated.ts placeholder (regen after phase 1)`
- **Depends on**: T0.22

---

### T0.26 · Root `CLAUDE.md` (project constitution)

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/CLAUDE.md`
- **Action**: create with sections:
  1. **Project identity** — name, owner, repo root, plan file pointer
  2. **Cold-boot protocol** — read CLAUDE.md → PROJECT-MAP.md → latest CHANGELOG entry → latest SESSION-LOG entry → `.planning/phases/N/verify.md` for current phase
  3. **Layer boundaries** — `packages/core` forbids `next | react | @supabase/* | @anthropic-ai/sdk | grammy | @tonconnect/* | @telegram-apps/*` (Biome-enforced). `apps/web/lib/*` implements `packages/core/application/ports/*`. `apps/web/features/*` consumes use cases, never reaches past ports.
  4. **Feature colocation** — feature code in `apps/web/features/<feature>/`; doc in `docs/features/<feature>.md`; tests colocated with source in `packages/core`.
  5. **Supabase workflow** — never edit past migrations; new file per change; `pnpm db:gen-types` after every migration; RLS policies checked against real Supabase local dev.
  6. **i18n rule** — Phase 1+: no bare user-facing strings. `t()` everywhere. Biome rule activated in Phase 1.
  7. **Telegram auth rule** — always verify raw `initData` server-side via HMAC; never trust `initDataUnsafe`; `server-only` guard on files importing `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_JWT_SECRET`.
  8. **Payment idempotency** — `UNIQUE(provider, provider_charge_id)` on `payments`; replay-safe webhook handlers.
  9. **ADR triggers** — any decision not reversible within a day → `docs/DECISIONS/NNNN-*.md` (numbered, immutable, supersede via new ADR).
  10. **TDD rule** — `packages/core/src/**` changes require a paired `packages/core/test/**` or colocated `*.test.ts`. Biome rule activated once first real domain entity exists (Phase 1).
  11. **Per-phase ritual (10 items, from REQUIREMENTS R-15)** — Code+tests green | feature doc | CHANGELOG | PROJECT-MAP | SESSION-LOG | CLAUDE.md if arch changed | ADR if decisions | auto-memory | `.planning/phases/N/verify.md` | typecheck+build+lint green.
  12. **Commit style** — conventional commits (`feat(scope):`, `fix(scope):`, `chore:`, `docs:`, `test:`, `refactor:`). Scopes: `web`, `core`, `db`, `ci`, `docs`.
  13. **TS strict settings locked** — `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`.
  14. **Tooling versions** — pnpm 10, Node ≥20, Turbo 2, Biome 1.9, Next.js 15, Tailwind v4.
  15. **Communication language** — owner talks to Claude in Russian; all code/commits/comments/docs in English.
  16. **Out of MVP** — scraping, matching, auto-apply, cover letter generation (all downstream); B2B side; Stripe; refunds; custom domain.
- **Verify**: file exists, ≥200 lines, cross-references `docs/`, `.planning/`, and plan file
- **Commit**: `docs: add root CLAUDE.md (project constitution)`
- **Depends on**: T0.3

---

### T0.27 · Root `README.md`

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/README.md`
- **Action**: create with sections:
  - **What this is** (1 paragraph elevator)
  - **Status** (Phase 0 complete / in progress)
  - **Prerequisites** — Node ≥20, pnpm 10, Supabase CLI, gh CLI, git
  - **Quickstart**:
    ```bash
    cp .env.example .env.local        # fill in real values as phases progress
    pnpm install
    pnpm --filter @ai-job-bot/db db:start
    pnpm dev                           # → http://localhost:3000
    curl http://localhost:3000/api/health
    ```
  - **Workspace layout** — tree showing `apps/web`, `packages/core`, `packages/db`, `docs/`, `.planning/`
  - **Scripts** — table of root scripts (dev/build/typecheck/lint/test)
  - **Further reading** — CLAUDE.md, docs/ARCHITECTURE.md, .planning/ROADMAP.md
- **Verify**: file exists; quickstart commands are copy-pasteable
- **Commit**: `docs: add README with quickstart`
- **Depends on**: T0.3

---

### T0.28 · `docs/ARCHITECTURE.md`

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/docs/ARCHITECTURE.md`
- **Action**: create with:
  - ASCII diagram (copied from plan file §Architecture Overview)
  - Layer responsibilities table (domain / application / infrastructure / presentation)
  - Package map: `apps/web` (presentation + infrastructure), `packages/core` (domain + application), `packages/db` (schema + types)
  - Data flow: Telegram client → Next.js → core use cases → Supabase
  - External dependencies: Anthropic Claude, Telegram Bot API, TON, ESCO API
  - Boundary enforcement: Biome `noRestrictedImports` forbids framework imports inside `packages/core`
  - Runtime model: Node runtime on all API routes (grammY needs Node); RSC-default on pages
  - "How to add a new feature" 8-step checklist
- **Verify**: file exists; references plan file + all 3 ADRs (even though only 0001-0003 exist in Phase 0)
- **Commit**: `docs: add ARCHITECTURE.md`
- **Depends on**: T0.3

---

### T0.29 · `docs/DECISIONS/0001-nextjs-as-bot-host.md`

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/docs/DECISIONS/0001-nextjs-as-bot-host.md`
- **Action**: ADR in standard format (Status / Context / Decision / Consequences / Alternatives considered):
  - **Status**: Accepted 2026-04-16
  - **Context**: Need to host both a Telegram bot webhook and a Mini App (React webview).
  - **Decision**: Single Next.js 15 App Router deployment on Vercel hosts both. Bot webhook lives at `app/api/bot/webhook/route.ts` (Node runtime, grammY). Mini App lives under `app/(app)/...` (mix of RSC + client).
  - **Consequences**: Shared types, auth, Supabase client across bot and UI. Single deploy pipeline. Downside: bot downtime = Mini App downtime. Mitigation: serverless scales per-route; Vercel edge cache handles RSC.
  - **Alternatives considered**: (a) separate Node bot server on Fly.io — rejected, adds ops overhead and type-sync friction; (b) Cloudflare Workers for bot — rejected, grammY Node-compat issues.
- **Verify**: file exists; follows ADR format
- **Commit**: `docs(adr): 0001 next.js hosts bot webhook + mini app`
- **Depends on**: T0.3

---

### T0.30 · `docs/DECISIONS/0002-supabase-as-shared-db.md`

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/docs/DECISIONS/0002-supabase-as-shared-db.md`
- **Action**: ADR:
  - **Status**: Accepted 2026-04-16
  - **Context**: Mini App writes paid campaigns; a future downstream worker (evolution of `job-hunter`) reads paid campaigns and executes scraping/applying.
  - **Decision**: Single Supabase project hosts both. Mini App writes; downstream reads via `v_paid_campaigns_for_worker` VIEW with `job_hunter_worker` Postgres role (narrow grants). Migrations under `packages/db/supabase/migrations/`.
  - **Consequences**: Shared source of truth, no sync drift. RLS enforces per-user isolation. Schema-version discipline required (`snapshot_data.schema_version: 1`). Downstream can evolve independently but must respect immutability trigger on paid campaigns.
  - **Alternatives considered**: (a) separate DBs + CDC — rejected, over-engineered for MVP; (b) REST API between services — rejected, extra network hop, latency.
- **Verify**: file exists; ADR format
- **Commit**: `docs(adr): 0002 supabase as shared db between mini app and downstream`
- **Depends on**: T0.3

---

### T0.31 · `docs/DECISIONS/0003-clean-architecture-layers.md`

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/docs/DECISIONS/0003-clean-architecture-layers.md`
- **Action**: ADR:
  - **Status**: Accepted 2026-04-16
  - **Context**: Long-lived project, single implementer (Claude), quality > speed, testability required for core business logic.
  - **Decision**: Clean Architecture with 4 layers — domain (pure TS), application (use cases + ports), infrastructure (adapters implementing ports), presentation (Next.js RSC/client). Framework-free code in `packages/core`; Next.js confined to `apps/web`. Layer boundary enforced by Biome `noRestrictedImports` rule on `packages/core/**/*.ts` forbidding `next`, `react`, `@supabase/*`, `@anthropic-ai/sdk`, `grammy`, `@tonconnect/*`, `@telegram-apps/*`.
  - **Consequences**: Business logic TDD-friendly (no framework coupling). Infrastructure swaps (Anthropic → Gemini, Supabase → Postgres) don't ripple into core. Slight indirection overhead (ports). Test pyramid: unit (core) → integration (adapters with Supabase local + MSW) → E2E (Playwright against `pnpm dev`).
  - **Alternatives considered**: (a) monolithic Next.js with logic in Server Actions — rejected, couples business rules to RSC lifecycle, hard to test without running the framework; (b) feature slices without layer separation — rejected, doesn't enforce the framework-free boundary needed for TDD on pricing/snapshot logic.
- **Verify**: file exists; ADR format
- **Commit**: `docs(adr): 0003 clean architecture with biome-enforced layer boundaries`
- **Depends on**: T0.3

---

### T0.32 · `docs/CHANGELOG.md`

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/docs/CHANGELOG.md`
- **Action**: create append-only changelog with Phase 0 entry stub:
  ```markdown
  # Changelog

  All notable changes per phase. Append-only.

  ## Phase 0 — Bootstrap & scaffolding (2026-04-16 → in progress)

  **Observable outcome:** `pnpm dev` runs empty Next.js app, `GET /api/health` returns 200, CI green, Supabase scaffolded locally.

  ### Added
  - Monorepo: pnpm 10 workspaces + Turborepo 2 (`apps/web`, `packages/core`, `packages/db`).
  - Next.js 15 App Router with minimal root layout, landing page, and `/api/health` endpoint (Node runtime).
  - Tailwind v4 with `@theme` block binding to Telegram `themeParams` CSS vars (stubbed; real runtime binding in Phase 1).
  - TypeScript 5.7 strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) shared via `tsconfig.base.json`.
  - Biome 1.9 with layer-boundary `noRestrictedImports` rules on `packages/core`.
  - `@t3-oss/env-nextjs` with Zod schema covering all env vars planned across all phases (Phase 0 needs only `NODE_ENV`; rest optional until wired).
  - Vitest 2 in `packages/core` with smoke test proving the test harness works.
  - Supabase CLI local dev — init migration (`20260417000000_init.sql`) creates `pgcrypto`, `pg_trgm`, `uuid-ossp` extensions. Tables land in subsequent phases.
  - Documentation spine: root `CLAUDE.md` (constitution), `README.md`, `docs/ARCHITECTURE.md`, ADRs 0001/0002/0003, `docs/CHANGELOG.md` (this file), `docs/PROJECT-MAP.md` (v0), `docs/SESSION-LOG.md`, `docs/features/bootstrap.md`.
  - GitHub Actions CI: typecheck + lint + build + unit tests on PR and main.

  ### Removed
  - `fe/` empty placeholder directory (replaced by `apps/web`).

  ### Notes
  - Supabase cloud project deferred — local dev works end-to-end; cloud link happens in Phase 1 (when bot webhook needs a public URL) or Phase 7 (production).
  - GitHub repo creation deferred unless user explicitly requests during execution.
  - `packages/db/types/generated.ts` is a placeholder; regenerated after Phase 1 migration adds first table.
  ```
- **Verify**: file exists; Phase 0 section reflects the planned state
- **Commit**: `docs: initialize CHANGELOG with phase 0 stub`
- **Depends on**: T0.3

---

### T0.33 · `docs/PROJECT-MAP.md` (v0)

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/docs/PROJECT-MAP.md`
- **Action**: create with template from plan file §Documentation Strategy, populated to Phase 0 state:
  ```markdown
  # Project Map — AI Job Bot (last updated: 2026-04-16, Phase 0)

  ## Live Systems
  - Bot: **not yet registered** (Phase 1: BotFather create)
  - Mini App: **not deployed** (local dev only; Vercel link in Phase 7)
  - DB: Supabase **local** (`supabase start` via `pnpm --filter @ai-job-bot/db db:start`). Cloud project deferred.
  - Anthropic: **not configured** (Phase 2)
  - TON: **not configured** (Phase 4)

  ## Data Model (current)
  *No tables yet. Extensions installed (`pgcrypto`, `pg_trgm`, `uuid-ossp`).*
  *Phase 1 adds `users`.*

  ## Flows Working End-to-End
  - ✅ `pnpm dev` boots Next.js; `GET /api/health` returns 200 (Phase 0)
  - ✅ `pnpm --filter @ai-job-bot/core test` runs Vitest smoke test (Phase 0)
  - ✅ `supabase start` + `supabase db reset` applies init migration (Phase 0)
  - ⏳ `/start` → users row (Phase 1)
  - ⏳ Profile upload + AI parse (Phase 2)
  - ⏳ Campaign wizard → draft (Phase 3)
  - ⏳ Payment → paid (Phase 4)
  - ⏳ Dashboard + notifications (Phase 5)

  ## Active Features
  - bootstrap (Phase 0) → `docs/features/bootstrap.md`

  ## Open Issues / Technical Debt
  - None at Phase 0.

  ## Env Vars Required (by phase)
  | Var | Phase | Notes |
  |---|---|---|
  | `NODE_ENV` | 0 | auto |
  | `SUPABASE_URL` + `SUPABASE_*_KEY` | 1 | from `supabase status` locally; cloud in Phase 7 |
  | `TELEGRAM_BOT_TOKEN` + `TELEGRAM_WEBHOOK_SECRET` | 1 | BotFather |
  | `ANTHROPIC_API_KEY` | 2 | Anthropic console |
  | `TON_API_KEY` | 4 | tonapi.io |
  | `SENTRY_DSN` | 7 | sentry.io |

  ## How to Resume From Cold
  1. Read `/CLAUDE.md` (rules).
  2. Read this file (state).
  3. Read the latest `docs/CHANGELOG.md` entry (what just shipped).
  4. Read the latest `docs/SESSION-LOG.md` entry (what was discussed).
  5. Read `.planning/phases/{current}/verify.md` for proof of the last completed phase.
  6. Run `pnpm dev` + `curl http://localhost:3000/api/health` to confirm boot.
  ```
- **Verify**: file exists, structure matches plan template
- **Commit**: `docs: add PROJECT-MAP.md v0`
- **Depends on**: T0.3

---

### T0.34 · `docs/SESSION-LOG.md`

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/docs/SESSION-LOG.md`
- **Action**: create append-only session log with the current session's entry:
  ```markdown
  # Session Log

  Append-only record of user ↔ Claude conversations. One entry per session.

  ## 2026-04-16 — Phase 0 scaffolding

  **Context:** Greenfield project kickoff. User approved the plan in `~/.claude/plans/effervescent-wibbling-breeze.md`. Intake docs (`PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, `config.json`) written. `/gsd:plan-phase 0` invoked.

  **Decisions made in planning (flagged as D1-D13 in `.planning/phases/0/PLAN.md`):**
  - pnpm 10 (not 9 per plan) — user's local tooling.
  - Supabase local-only in Phase 0; cloud deferred.
  - GitHub repo creation deferred unless explicitly confirmed during execution.
  - Turbo 2 (stable, matches plan file).
  - `tsconfig.base.json` at repo root for shared strict settings.
  - Placeholder `packages/db/types/generated.ts` (regenerated in Phase 1).
  - CI matrix: typecheck + lint + build + unit only (E2E/visual activated in Phase 1).

  **Questions raised:** None — plan was sufficiently detailed.

  **Open to user:** confirm during execution whether to create GitHub repo now (T0.40) or defer to Phase 7.

  **Next session:** `/gsd:execute-phase 0` — run tasks T0.1 → T0.41 in order.
  ```
- **Verify**: file exists with one entry
- **Commit**: `docs: initialize SESSION-LOG with phase 0 planning entry`
- **Depends on**: T0.3

---

### T0.35 · `docs/features/bootstrap.md`

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/docs/features/bootstrap.md`
- **Action**: create feature doc per REQUIREMENTS R-15.2 template:
  ```markdown
  # Feature: Bootstrap & Scaffolding

  **Phase:** 0
  **Status:** Shipped 2026-04-XX (fill at completion)
  **Owner:** Claude (solo implementation)

  ## Purpose
  Stand up the monorepo, tooling, and documentation spine that every subsequent phase depends on. After this phase, `pnpm dev` runs an empty Next.js app with a health endpoint, `packages/core` tests run via Vitest, Supabase local dev is ready, and the documentation constitution (CLAUDE.md, PROJECT-MAP, CHANGELOG, SESSION-LOG, ADRs 0001-0003) is in place.

  ## What shipped
  - **Monorepo layout** — pnpm 10 workspaces + Turborepo 2. Three packages: `apps/web` (Next.js), `packages/core` (framework-free TS), `packages/db` (Supabase schema + types).
  - **Next.js 15 App Router** — minimal root layout, landing page at `/`, health endpoint at `/api/health` (Node runtime, returns 200 JSON).
  - **Tailwind v4** — `@theme` block in `globals.css` with Telegram `themeParams` CSS vars stubbed; real runtime binding in Phase 1 via `TelegramProvider`.
  - **TypeScript strict** — shared `tsconfig.base.json` with `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`.
  - **Biome 1.9** — replaces ESLint+Prettier; layer-boundary `noRestrictedImports` on `packages/core` forbids `next`, `react`, `@supabase/*`, `@anthropic-ai/sdk`, `grammy`, `@tonconnect/*`, `@telegram-apps/*`.
  - **Env validation** — `@t3-oss/env-nextjs` + Zod schema covering all env vars planned across all phases (Phase 1+ vars marked `.optional()` until wired).
  - **Vitest** — wired in `packages/core` with a smoke test proving the harness works.
  - **Supabase local dev** — `supabase init` → `config.toml` + init migration (`20260417000000_init.sql`) creating `pgcrypto`, `pg_trgm`, `uuid-ossp` extensions. No tables yet.
  - **CI** — `.github/workflows/ci.yml` runs typecheck + lint + build + unit tests on PR and push to `main`.
  - **Docs spine** — `CLAUDE.md` (root constitution), `README.md`, `docs/ARCHITECTURE.md`, ADRs 0001 (Next.js as bot host), 0002 (Supabase as shared DB), 0003 (Clean Architecture layers), `docs/CHANGELOG.md`, `docs/PROJECT-MAP.md` (v0), `docs/SESSION-LOG.md`, this feature doc.

  ## Data flow
  None at Phase 0 — no user-touching flows. The only runtime flow is `GET /api/health → { status: 'ok' }`, which exists solely to prove the app boots.

  ## Schema deltas
  Migration `20260417000000_init.sql`:
  - `CREATE EXTENSION pgcrypto` — for `gen_random_uuid()` in subsequent phases.
  - `CREATE EXTENSION pg_trgm` — for similarity/fuzzy matching in Phase 3 (dedup, ESCO search).
  - `CREATE EXTENSION "uuid-ossp"` — fallback.
  - No tables.

  ## UX states
  - Phase 0 has no UX beyond `/` showing `<h1>ai-job-bot</h1>` and a link to `/api/health`. Purpose: prove the app boots in the browser.

  ## Edge cases
  - `pnpm install` on a fresh clone must succeed without any `.env.local` (all Phase 1+ env vars are `.optional()` in the Zod schema).
  - `supabase start` requires Docker running — documented in README prerequisites.
  - `supabase db reset` is safe — the init migration is idempotent (uses `CREATE EXTENSION IF NOT EXISTS`).

  ## Related ADRs
  - [0001 — Next.js as bot host](../DECISIONS/0001-nextjs-as-bot-host.md)
  - [0002 — Supabase as shared DB](../DECISIONS/0002-supabase-as-shared-db.md)
  - [0003 — Clean Architecture layers](../DECISIONS/0003-clean-architecture-layers.md)

  ## Open follow-ups for Phase 1
  - Wire real Telegram `themeParams` → CSS vars via `TelegramProvider`.
  - Add first real migration (`users` table + RLS + custom JWT claim setup).
  - Regenerate `packages/db/types/generated.ts` after `users` migration.
  - Activate Biome i18n rule (no bare user-facing strings) once `next-intl` is wired.
  - Activate `server-only` Biome enforcement once `lib/supabase/server.ts` exists.
  ```
- **Verify**: file exists; all R-15 fields filled
- **Commit**: `docs(features): add bootstrap.md`
- **Depends on**: T0.3

---

### T0.36 · `.github/workflows/ci.yml`

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/.github/workflows/ci.yml`
- **Action**: create GitHub Actions workflow:
  ```yaml
  name: CI

  on:
    pull_request:
      branches: [main]
    push:
      branches: [main]

  jobs:
    quality:
      runs-on: ubuntu-latest
      timeout-minutes: 10
      steps:
        - uses: actions/checkout@v4

        - uses: pnpm/action-setup@v4
          with:
            version: 10

        - uses: actions/setup-node@v4
          with:
            node-version: 20
            cache: pnpm

        - name: Install
          run: pnpm install --frozen-lockfile

        - name: Typecheck
          run: pnpm -w typecheck

        - name: Lint
          run: pnpm -w lint

        - name: Build
          run: pnpm -w build
          env:
            SKIP_ENV_VALIDATION: '1'  # allow build without real secrets

        - name: Unit tests
          run: pnpm -w test:unit
  ```
- **Verify**: YAML valid; job steps map to pnpm scripts that exist
- **Commit**: `ci: add github actions workflow (typecheck + lint + build + unit)`
- **Depends on**: T0.3, T0.10, T0.18

---

### T0.37 · `pnpm install` (verify lockfile generates cleanly)

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/pnpm-lock.yaml` (generated)
- **Action**: run `cd /Users/vadymmelnychenko/Projects/ai-job-bot && pnpm install`
- **Verify**:
  - Exit code 0
  - `pnpm-lock.yaml` exists and is ≥ few KB
  - No deprecated-package warnings for the core deps (Next 15, React 19, Tailwind v4)
- **Commit**: `chore: generate pnpm-lock.yaml` (or amend a prior commit — verify what's clean per session)
- **Depends on**: T0.10, T0.18, T0.22 (and all package.json files)

---

### T0.38 · `pnpm -w typecheck && pnpm -w build` — verify green

- **Files**: none (verification step)
- **Action**: run `pnpm -w typecheck` then `pnpm -w build`
- **Verify**:
  - Both exit 0
  - `apps/web/.next/` produced
  - No TS errors, no Biome lint errors (if Biome is wired into `lint` script)
- **Commit**: (no commit — verification only; if a fix was needed, fix commit already happened in the task that caused the error)
- **Depends on**: T0.37, T0.13, T0.14, T0.16, T0.17, T0.21

---

### T0.39 · `pnpm dev` — smoke test (start → curl health → kill)

- **Files**: none (verification step)
- **Action**:
  1. Run `pnpm dev` in background.
  2. Wait for "Ready in Xms" (Next.js boot signal).
  3. `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health` → expect `200`.
  4. `curl -s http://localhost:3000/api/health | jq -e '.status == "ok"'` → expect exit 0.
  5. Kill the dev process.
- **Verify**: both curl commands succeed; process shut down cleanly.
- **Commit**: (no commit — verification only)
- **Depends on**: T0.38

---

### T0.40 · [CHECKPOINT] Create GitHub repo + push (user-confirmed, else defer)

- **Files**: none locally (remote side effect)
- **Action**: Ask user at execution time:
  > "Create GitHub repo `ai-job-bot` now and push `main`? (y/N)
  > — If yes, repo will be private by default. Use `gh repo create ai-job-bot --private --source=. --remote=origin --push`.
  > — If no, defer to Phase 7 (production hardening)."
  - On "y": run `cd /Users/vadymmelnychenko/Projects/ai-job-bot && git add . && git commit` (if dirty) then `gh repo create ai-job-bot --private --source=. --remote=origin --push`.
  - On "n" or skip: log the deferral in SESSION-LOG entry and move on.
- **Verify**: if done, `gh repo view ai-job-bot` shows the repo; `git remote -v` shows origin.
- **Commit**: N/A (repo creation is not a commit)
- **Depends on**: T0.38 (need green build before pushing)

---

### T0.41 · `.planning/phases/0/verify.md` — verification proof

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/.planning/phases/0/verify.md`
- **Action**: create proof document per R-15.9:
  ```markdown
  # Phase 0 — Verification Proof

  **Completed:** YYYY-MM-DD HH:MM (fill at completion)
  **Executor:** Claude (solo)

  ## Observable outcome claim
  > `pnpm dev` runs empty Next.js app, `GET /api/health` returns 200, CI green, Supabase scaffolded locally.

  ## Evidence

  ### 1. Clean `pnpm install`
  ```
  $ pnpm install
  <paste last 5 lines>
  ```

  ### 2. Typecheck green
  ```
  $ pnpm -w typecheck
  <paste tail>
  ```

  ### 3. Build green
  ```
  $ pnpm -w build
  <paste tail showing successful build output>
  ```

  ### 4. Lint green
  ```
  $ pnpm -w lint
  <paste tail>
  ```

  ### 5. Unit tests green
  ```
  $ pnpm -w test:unit
  <paste tail showing 1 passed test>
  ```

  ### 6. `pnpm dev` boots + health endpoint returns 200
  ```
  $ pnpm dev &
  $ curl -s -w "\nHTTP %{http_code}\n" http://localhost:3000/api/health
  {"status":"ok","service":"ai-job-bot-web","commit":"local","ts":"2026-04-XX..."}
  HTTP 200
  ```

  ### 7. Supabase local dev starts + migration applies
  ```
  $ pnpm --filter @ai-job-bot/db db:start
  $ pnpm --filter @ai-job-bot/db db:reset
  <paste tail showing "Applying migration 20260417000000_init.sql"... Finished>
  ```

  ### 8. Biome layer rule enforced
  ```
  $ echo "import next from 'next'; export const x = 1;" > packages/core/src/bad.ts
  $ pnpm exec biome check packages/core/src/bad.ts
  <paste output showing noRestrictedImports violation>
  $ rm packages/core/src/bad.ts
  ```

  ### 9. CI workflow (if pushed to GitHub)
  - Link to passing CI run: <URL or "deferred, repo not yet pushed">

  ## Per-Phase Ritual Checklist (R-15)

  - [x] R-15.1 Code + tests green — see sections 2-5 above.
  - [x] R-15.2 `docs/features/bootstrap.md` created.
  - [x] R-15.3 `docs/CHANGELOG.md` appended.
  - [x] R-15.4 `docs/PROJECT-MAP.md` reflects Phase 0 state (v0).
  - [x] R-15.5 `docs/SESSION-LOG.md` appended with Phase 0 entry.
  - [x] R-15.6 `CLAUDE.md` (root) created — this is the initial constitution.
  - [x] R-15.7 ADRs 0001, 0002, 0003 written.
  - [ ] R-15.8 Auto-memory note — only if cross-session insight emerged. **Candidate:** `pnpm 10 works fine despite plan saying 9`. Save if worth it.
  - [x] R-15.9 `.planning/phases/0/verify.md` — this file.
  - [x] R-15.10 Typecheck + build + lint green — see sections 2-4.
  ```
- **Verify**: file exists; all evidence sections filled in with real command output
- **Commit**: `docs: add phase 0 verification proof`
- **Depends on**: T0.38, T0.39, T0.40 (if run) + all prior tasks

---

## 3. Dependency Graph (high-level)

```
T0.1 (supabase CLI)
T0.2 (rm fe/)
   ↓
T0.3 (root package.json) ─┬─→ T0.4 (workspace) ─┬─→ T0.10 (web pkg)
                           ├─→ T0.5 (turbo)     │     ↓
                           ├─→ T0.6 (biome)     │   T0.11 (next.config)
                           ├─→ T0.7 (tsbase)    │   T0.12 (web tsconfig) ← T0.7
                           ├─→ T0.8 (env.ex)    │     ↓
                           ├─→ T0.9 (gitign)    │   T0.15 (tailwind cfg)
                           │                     │   T0.16 (globals.css)
                           │                     │   T0.17 (env.ts) ← T0.12
                           │                     │     ↓
                           │                     │   T0.13 (layout/page) ← T0.11,T0.12,T0.16
                           │                     │   T0.14 (health route) ← T0.12
                           │                     ↓
                           ├─→ T0.18 (core pkg) ── T0.19 (core tsconfig) ← T0.7
                           │                      │    ↓
                           │                      │  T0.20 (index/dirs)
                           │                      │    ↓
                           │                      │  T0.21 (vitest + smoke)
                           │                      ↓
                           ├─→ T0.22 (db pkg)   ← T0.1
                           │     ↓
                           │   T0.23 (supabase init)
                           │     ↓
                           │   T0.24 (init migration)
                           │   T0.25 (types placeholder)
                           │
                           ├─→ T0.26 (CLAUDE.md)
                           ├─→ T0.27 (README)
                           ├─→ T0.28 (ARCHITECTURE)
                           ├─→ T0.29 (ADR 0001)
                           ├─→ T0.30 (ADR 0002)
                           ├─→ T0.31 (ADR 0003)
                           ├─→ T0.32 (CHANGELOG)
                           ├─→ T0.33 (PROJECT-MAP)
                           ├─→ T0.34 (SESSION-LOG)
                           ├─→ T0.35 (features/bootstrap)
                           └─→ T0.36 (ci.yml) ← T0.10,T0.18

                                        ↓ all above complete
                                    T0.37 (pnpm install)
                                        ↓
                                    T0.38 (typecheck + build)
                                        ↓
                                    T0.39 (pnpm dev smoke)
                                        ↓
                                    T0.40 [checkpoint] (gh repo — optional)
                                        ↓
                                    T0.41 (verify.md)
```

**Parallelizable clusters** (safe to batch-execute):
- **Wave A (after T0.3 & T0.4):** T0.5, T0.6, T0.7, T0.8, T0.9 — all root config files, no interdep.
- **Wave B (after T0.7):** T0.10, T0.18, T0.22 — three package.json files, independent.
- **Wave C (after T0.10 + T0.12):** T0.11, T0.14, T0.15, T0.16, T0.17 — apps/web scaffolding files, mostly independent (T0.13 depends on T0.16 so it comes after).
- **Wave D (after T0.18 + T0.19):** T0.20, T0.21 — core files in sequence (T0.21 needs T0.20 for the import).
- **Wave E (after T0.22 + T0.1):** T0.23 → T0.24 → T0.25 — Supabase sequential (init → migration → types).
- **Wave F (after T0.3):** T0.26, T0.27, T0.28, T0.29, T0.30, T0.31, T0.32, T0.33, T0.34, T0.35 — ALL docs are parallelizable (no code dependencies).
- **Wave G:** T0.36 — CI file (needs all package.jsons to exist).
- **Sequential finale:** T0.37 → T0.38 → T0.39 → T0.40 → T0.41.

Serial path length: ~10 steps (T0.1 → T0.3 → T0.10 → T0.12 → T0.16 → T0.13 → T0.37 → T0.38 → T0.39 → T0.41). Everything else batches around this critical path.

---

## 4. Risks & Unknowns (Phase 0 specifically)

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Tailwind v4 breaking changes** — v4 is newly stable; `@theme` block syntax may not match old docs. | Medium | Build may fail with cryptic errors. | Use the v4-specific postcss plugin (`@tailwindcss/postcss`), keep config minimal, reference Tailwind v4 changelog during execution. |
| **Next.js 15 + React 19 + TS 5.7 triangle** — all three are recent. | Medium | Typecheck may fail on Next's internal types. | Pin all three to latest stable on execution day; `skipLibCheck: true` in base tsconfig softens this. |
| **Biome layer rule syntax** — `noRestrictedImports` overrides by path glob. | Low | Rule silently doesn't fire. | Verify in T0.6 by creating a deliberate violation (T0.41 section 8). |
| **Supabase CLI brew install** — first-time install on this machine. | Low | Install error requires troubleshooting. | Fallback: direct binary install via `curl -L https://github.com/supabase/cli/releases/latest/... \| tar xz`. |
| **Docker not running** when `supabase start` is called. | Medium | Error "Cannot connect to Docker daemon". | README prerequisites list Docker; T0.23 checks `docker info` first. |
| **pnpm 10 workspace protocol version** — the lockfile format differs slightly from v9. | Low | CI pnpm-setup-action might default to 9. | Pin `version: 10` explicitly in `pnpm/action-setup@v4` (done in T0.36). |
| **`server-only` package on React 19** — may have a compat shim issue. | Low | Build warnings. | If warnings appear, switch to manual check: `import 'server-only'` from the `server-only` package works universally. |
| **`typedRoutes` + `typedEnv` experimental flags** in `next.config.ts` — occasionally break on fresh projects. | Low | Build fails. | Drop the flags; they are not Phase 0 requirements. Re-add in Phase 1 if stable. |
| **`@t3-oss/env-nextjs` with only optional vars** — some past versions required at least one non-optional var. | Low | Build-time Zod error. | Keep `NODE_ENV` as required (has `.default()`); rest optional. |
| **Biome 1.9 config schema vs plan's assumption** — rule names may have changed. | Low | Biome ignores rules. | Verify each rule name against the current Biome docs at execution. `noRestrictedImports` is stable. |

None of these are showstoppers; all have concrete mitigations.

---

## 5. Verification Section (Phase 0 acceptance criteria, explicit)

Run these commands in order after all 41 tasks complete. Paste output into `.planning/phases/0/verify.md`.

```bash
cd /Users/vadymmelnychenko/Projects/ai-job-bot

# 1. Install is clean
pnpm install
test $? -eq 0 || { echo "install FAILED"; exit 1; }
test -f pnpm-lock.yaml || { echo "no lockfile"; exit 1; }

# 2. Typecheck + lint + build all green
pnpm -w typecheck
pnpm -w lint
SKIP_ENV_VALIDATION=1 pnpm -w build

# 3. Unit tests pass
pnpm -w test:unit

# 4. Dev server boots + health endpoint responds
pnpm dev &
DEV_PID=$!
sleep 5
curl -fs -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3000/api/health
RESP=$(curl -s http://localhost:3000/api/health)
echo "$RESP" | jq -e '.status == "ok"' > /dev/null || { echo "health endpoint malformed"; kill $DEV_PID; exit 1; }
kill $DEV_PID

# 5. Supabase local stack starts + migration applies
pnpm --filter @ai-job-bot/db db:start
pnpm --filter @ai-job-bot/db db:reset  # applies init migration
pnpm --filter @ai-job-bot/db db:stop

# 6. Biome layer rule actually fires
cat > /tmp/bad-import.ts <<'EOF'
import next from 'next';
export const x = 1;
EOF
cp /tmp/bad-import.ts packages/core/src/bad-import-test.ts
pnpm exec biome check packages/core/src/bad-import-test.ts
# expect non-zero exit with noRestrictedImports error
rm packages/core/src/bad-import-test.ts

# 7. Docs spine exists
test -f CLAUDE.md
test -f README.md
test -f docs/ARCHITECTURE.md
test -f docs/CHANGELOG.md
test -f docs/PROJECT-MAP.md
test -f docs/SESSION-LOG.md
test -f docs/features/bootstrap.md
test -f docs/DECISIONS/0001-nextjs-as-bot-host.md
test -f docs/DECISIONS/0002-supabase-as-shared-db.md
test -f docs/DECISIONS/0003-clean-architecture-layers.md

# 8. CI workflow file exists and is valid YAML
test -f .github/workflows/ci.yml
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))" && echo "CI YAML valid"

echo "Phase 0 acceptance: ALL GREEN"
```

**Phase 0 is DONE when:**
1. All 41 tasks committed.
2. The verification block above exits 0 end-to-end.
3. `.planning/phases/0/verify.md` contains pasted real output from each step.
4. Per-phase ritual checklist (below) has all applicable boxes checked.

---

## 6. Per-Phase Ritual Checklist (from REQUIREMENTS R-15)

Verify before declaring Phase 0 complete.

- [ ] **R-15.1** Code + tests green (typecheck + lint + build + unit all pass)
- [ ] **R-15.2** `docs/features/bootstrap.md` created/updated
- [ ] **R-15.3** `docs/CHANGELOG.md` appended with Phase 0 entry
- [ ] **R-15.4** `docs/PROJECT-MAP.md` reflects v0 state
- [ ] **R-15.5** `docs/SESSION-LOG.md` appended with Phase 0 planning + execution entries
- [ ] **R-15.6** `CLAUDE.md` (root) created as the initial constitution
- [ ] **R-15.7** ADRs written: 0001 (Next.js as host), 0002 (Supabase shared), 0003 (Clean Architecture)
- [ ] **R-15.8** Auto-memory note saved IF cross-session insight emerged (candidate: "pnpm 10 works despite plan saying 9"; save only if worth keeping)
- [ ] **R-15.9** `.planning/phases/0/verify.md` shows proof of working outcome with pasted command output
- [ ] **R-15.10** Typecheck + build + lint green (same as R-15.1 but restated because the plan says 10 items)
