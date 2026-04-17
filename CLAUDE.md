# AI Job Bot — Project Constitution

This document is the first thing Claude reads when joining a session on this repo. It encodes
the non-negotiable rules, the cold-boot protocol, and the conventions every feature must follow.

## 1. Project Identity

- **Name:** AI Job Bot — Telegram Mini App
- **Owner:** Vadym Melnychenko (melnicenkovadik@gmail.com, @melnychenkovad)
- **Repo root:** `/Users/vadymmelnychenko/Projects/ai-job-bot`
- **Authoritative plan:** `~/.claude/plans/effervescent-wibbling-breeze.md`
- **Planning artifacts:** `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`,
  `.planning/ROADMAP.md`, `.planning/config.json`, `.planning/phases/N/PLAN.md`

## 2. Cold-Boot Protocol (read in this order when resuming)

1. This file — rules + guardrails.
2. `docs/PROJECT-MAP.md` — current system state (what's live, what's next).
3. Latest `docs/CHANGELOG.md` entry — what just shipped.
4. Latest `docs/SESSION-LOG.md` entry — what was discussed last.
5. `.planning/phases/<current>/verify.md` — proof of the last completed phase.
6. `.planning/phases/<next>/PLAN.md` if planning the next phase.

Confirm app boots: `pnpm install && pnpm dev` → `curl http://localhost:3000/api/health`.

## 3. Layer Boundaries (Clean Architecture, Biome-enforced)

- `packages/core` — framework-free TypeScript. Domain + application layers.
  **Forbidden imports** (Biome `noRestrictedImports`): `next`, `next/*`, `react`, `react-dom`,
  `@supabase/*`, `@anthropic-ai/sdk`, `grammy`, `@tonconnect/*`, `@telegram-apps/*`.
- `apps/web/lib/*` — infrastructure adapters implementing `packages/core/application/ports/*`.
- `apps/web/features/*` — presentation. Consumes use cases via ports, never reaches past them.
- `apps/web/app/*` — Next.js routing + RSC/client components.
- `packages/db` — Supabase schema + generated types. No runtime logic.

Any violation of these rules is a lint error. Don't suppress; restructure.

## 4. Feature Colocation & Documentation

- Feature code lives in `apps/web/features/<feature>/`.
- Every shipped feature ships with a doc: `docs/features/<feature>.md`.
- Domain tests live next to sources in `packages/core/src/**/*.test.ts` or in `packages/core/test/`.

## 5. Supabase Workflow

- **Never edit past migrations.** One migration file per change, timestamped.
- After every migration: `pnpm --filter @ai-job-bot/db db:gen-types` regenerates
  `packages/db/types/generated.ts`.
- RLS policies are part of the migration; test them against local Supabase (`supabase start`).
- `supabase start` is deferred until Phase 1 (needs Docker running).
- Cloud project linking deferred to Phase 1 (when bot webhook needs a public URL) or Phase 7.

## 6. i18n — Wrap-First Discipline (enforced from Phase 1)

- No bare user-facing strings. Every string is `t('key.path')`.
- Five locales: `en | uk | ru | it | pl`. Default `en`, auto-detected from
  `initData.user.language_code`; user override via Settings cookie (Phase 5).
- Real translations land in Phase 6. Phase 1-5: EN + `[LOCALE] ...` prefixed stubs for
  others — missing translations stay visually obvious during dev.
- `apps/web/messages/messages-parity.test.ts` blocks PRs that add a key to one locale
  without adding it to the other four.
- "No bare strings" is **manually reviewed** in Phase 1-5 (D1.10). Custom Biome plugin /
  codemod lands in Phase 6 alongside real translations.

## 7. Telegram Auth Rule

- **Always** verify raw `initData` server-side via HMAC-SHA256 against
  `sha256("WebAppData" + BOT_TOKEN)`.
- **Never** trust `window.Telegram.WebApp.initDataUnsafe`.
- `initData.auth_date` freshness: ≤ 24h for reads, ≤ 1h for payment endpoints.
- Bot webhook verifies `X-Telegram-Bot-Api-Secret-Token` header (different trust path).
- `scripts/set-webhook.ts` always passes `secret_token` to Telegram's `setWebhook` API;
  re-run after every `ngrok` session (free tier rotates subdomain per run).
- Supabase JWT TTL is 15 minutes. Browser silently re-posts `initData` on 401.
- Any module importing `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_JWT_SECRET` MUST also import
  `server-only`. Biome `noRestrictedImports` enforcement on missing `server-only` is a
  Phase 7 hardening task (manual review until then).

## 8. Payment Idempotency

- `payments` table has `UNIQUE(provider, provider_charge_id)` — webhook replay safe.
- `snapshot_data` is frozen at "Pay" button click (not earlier).
- Postgres trigger `enforce_snapshot_immutability()` blocks UPDATEs to snapshot fields on
  `status IN ('paid', 'running', 'completed')`.

## 9. ADR Triggers

- Any decision not reversible within a day → `docs/DECISIONS/NNNN-kebab-title.md`.
- Format: Status / Context / Decision / Consequences / Alternatives considered.
- ADRs are immutable. To override, write a new ADR that supersedes the old one.

## 10. TDD in `packages/core`

- Every new source file in `packages/core/src/**` requires a paired test file.
- Red → green → refactor. Biome rule enforces the paired-test requirement (activates in Phase 1
  when the first real domain entity is added).
- Property-based tests (`fast-check`) for: pricing, snapshot canonical JSON, state machines.

## 11. Per-Phase Ritual (R-15, mandatory gate before advancing)

1. Code + tests green (typecheck + lint + build + unit).
2. `docs/features/<feature>.md` created/updated.
3. `docs/CHANGELOG.md` appended with Phase entry.
4. `docs/PROJECT-MAP.md` reflects new state.
5. `docs/SESSION-LOG.md` appended.
6. This file (`CLAUDE.md`) updated if arch or rules changed.
7. `docs/DECISIONS/NNNN-*.md` if any irreversible decision was made.
8. Auto-memory note (via `/claude:memory`) if a cross-session insight emerged.
9. `.planning/phases/N/verify.md` shows proof of working outcome.
10. Typecheck + build + lint all green (enforced by CI).

## 12. Commit Style

Conventional commits:

| Type | Use for |
|---|---|
| `feat(scope)` | new user-facing or developer-facing feature |
| `fix(scope)` | bug fix |
| `chore(scope)` | tooling, config, dependencies |
| `docs(scope)` | documentation only |
| `test(scope)` | test-only changes |
| `refactor(scope)` | behavior-preserving cleanup |
| `ci` | CI workflow changes |

Scopes: `web`, `core`, `db`, `ci`, `docs`, `adr`.

One task = one commit. Never amend committed work. Never `--no-verify`.

## 13. TypeScript Strict Settings (locked)

`tsconfig.base.json` has:
- `strict: true`
- `noUncheckedIndexedAccess: true`
- `exactOptionalPropertyTypes: true`
- `noImplicitOverride: true`
- `noFallthroughCasesInSwitch: true`

If TS errors appear, **fix the code**, don't soften the flag.

## 14. Tooling Versions

- Node **≥20** (engines), pnpm **10** (`packageManager`)
- Turbo **2**
- Biome **1.9+** (replaces ESLint + Prettier)
- Next.js **15** App Router
- React **19**
- Tailwind **v4** — uses `@theme` block in CSS, NOT `tailwind.config.ts` JS config.
- TypeScript **5.7+**
- Supabase CLI **2.90+**
- Vitest **2**, Playwright **1.49+** (wired per phase)

## 15. Runtime Model

- API routes default to **Node runtime** (`export const runtime = 'nodejs'`).
  grammY requires Node; Edge runtime lacks the needed APIs.
- Pages are **RSC-default**. Add `'use client'` only where interactivity demands it.
- `server-only` guard on files importing service-role keys.

## 16. Communication Language

- Owner speaks Russian with Claude.
- All code, commits, comments, documentation in English.

## 17. Out of MVP Scope

Explicitly deferred to post-MVP:
- Scraping, matching, auto-apply, cover letter generation (downstream service).
- B2B / employer side.
- Stripe payments (Stars + TON prove insufficient first).
- Refund flow (no-refund disclosure in MVP).
- Custom domain (Vercel `*.vercel.app` for MVP).
- Paid categories beyond those with downstream scrapers.

## 18. Phase Status

| Phase | Status | Outcome |
|---|---|---|
| 0 — Bootstrap & scaffolding | **shipped** 2026-04-16 | `pnpm dev` boots, `/api/health` returns 200 |
| 1 — Bot + Mini App skeleton + auth | **shipped** 2026-04-17 | `/start` → users row, UI contract shipped, greeting renders |
| 2 — Profile + AI resume parse | pending | PDF → AI parse → profile saved |
| 3 — Campaign wizard | pending | **3-screen** wizard (per `~/.claude/plans/lucky-noodling-pike.md`) → draft campaign |
| 4 — Payments (Stars + TON) | pending | paid → snapshot frozen |
| 5 — Dashboard & notifications | pending | returning user sees dashboard + pushes |
| 6 — i18n + a11y + theme polish | pending | 5 locales, WCAG AA |
| 7 — Production hardening & handoff | pending | prod deploy, RUNBOOK |

## 19. Quick Reference: When In Doubt

- **Adding a port?** `packages/core/src/application/ports/<name>.ts` — interface only.
- **Adding an adapter?** `apps/web/lib/<provider>/<name>.ts` — imports port, implements it.
- **Adding a UI feature?** `apps/web/features/<feature>/` — consumes use cases only.
- **Building a screen?** Compose `<Screen>` + `<Scroll>` + `<Stack>` / `<Row>` /
  `<Section>` / `<FieldGroup>` / `<HScroll>` / `<Clamp>` from `@/components/ui/layout`.
  Never write raw `<div className="flex ...">` — the primitives carry the
  min-w-0 / overflow-wrap / safe-area / touch-target invariants.
- **Writing a migration?** `packages/db/supabase/migrations/YYYYMMDDHHMMSS_<slug>.sql`.
- **Need a new env var?** Add to `.env.example` + `apps/web/lib/env.ts` + note its phase.

## 20. Responsive UI Contract (enforced from Phase 1)

See `docs/features/ui-contract.md` for the full spec. Core rules:

- **One primitive per layout job.** `<Screen>` roots, `<Scroll>` is the sole owner of
  `overflow-y`, `<HScroll>` is the sole owner of `overflow-x`. Body never scrolls.
- **`min-w-0` on every text-carrying flex child.** Built into the primitives; don't fight it.
- **No `100vh`.** Use `min-h-[var(--tg-viewport-height,100vh)]` via `<Screen>`.
- **No fixed pixel widths** in feature code (`w-[Npx]`). Primitives are allowed; features
  are not. Enforcement is code review in Phase 1-5; custom Biome plugin in Phase 6.
- **Any `fixed|absolute|translate|sticky`** in feature code requires a
  `/* layout-safe: <rationale> */` comment on the same line.
- **Touch targets ≥ 44×44 px** via `min-h-[2.75rem]` on interactive elements.
- **Telegram MainButton reserve** — `<Screen>` defaults `reserveMainButton={true}` which
  adds 96px bottom padding. Only disable on dev fixtures.
- **Theme comes from CSS variables** set by `<ThemeBridge>` from `Telegram.WebApp.themeParams`.
  Automatic light/dark parity; no `dark:` class needed.
- **Visual regression baselines** live under Playwright; first-run baselines are blessed
  manually (`--update-snapshots`), subsequent runs compare. Re-bless only when a primitive
  genuinely changed.
