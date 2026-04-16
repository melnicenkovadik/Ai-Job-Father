# Project State

**Last updated:** 2026-04-16
**Current phase:** Phase 0 shipped (38 atomic commits). Phase 1 planning next.
**Plan file:** `~/.claude/plans/effervescent-wibbling-breeze.md`

## Where we are

Phase 0 (Bootstrap & Scaffolding) ✅ complete. Independently verified: 38 atomic conventional commits, all ritual artifacts present, typecheck green across 3 packages, `pnpm dev` + `/api/health` confirmed.

Artifacts shipped:
- Monorepo scaffolded (pnpm 10 + Turborepo 2, `apps/web` + `packages/core` + `packages/db`)
- Next.js 15 App Router with health endpoint
- Biome 1.9.4 with layer-boundary `noRestrictedImports` (validated — `packages/core` blocks `next`, `react`, etc.)
- Tailwind v4 with `@theme` in CSS (no JS config)
- TS strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
- Supabase CLI installed, `supabase init` done (local `supabase start` deferred — Docker)
- CI workflow (typecheck + lint + build + unit)
- Root docs: `CLAUDE.md`, `README.md`, `docs/ARCHITECTURE.md`, 3 ADRs, `CHANGELOG.md`, `PROJECT-MAP.md` (v0), `SESSION-LOG.md`, `docs/features/bootstrap.md`, `.planning/phases/0/verify.md`

Deferred from Phase 0:
- T0.40 GitHub repo creation (moved to Phase 7 or on-request)
- `supabase start` (needs Docker; Phase 1 if required)
- Supabase cloud project (Phase 1 for webhook public URL, or Phase 7)

## What's next

1. `/gsd:plan-phase 1` — Bot + Mini App skeleton + auth (in progress)
2. Execute Phase 1 — will pause on BotFather interaction (bot token required)
3. Verify Phase 1
4. Repeat for phases 2 through 7
5. `/gsd:complete-milestone` at MVP end

## Key references (for new sessions)

1. **Read first:** `~/.claude/plans/effervescent-wibbling-breeze.md` — full design
2. **Then:** `.planning/PROJECT.md` (context), `.planning/REQUIREMENTS.md` (scope), `.planning/ROADMAP.md` (phases)
3. **For live state:** `docs/PROJECT-MAP.md` (populated from Phase 0+)
4. **For narrative:** `docs/CHANGELOG.md` + `docs/SESSION-LOG.md` (populated from Phase 0+)
5. **For rules:** `CLAUDE.md` root file (populated from Phase 0+)

## Open questions (non-blocking)

1. Pricing tiers — propose in Phase 3 planning
2. Supabase region — recommend EU-central Frankfurt; confirm in Phase 0
3. Mini App custom domain — MVP stays on `*.vercel.app`; revisit Phase 7
4. Resume retention — recommend purge raw PDF at 90d post-parse; confirm in Phase 2
5. Refund policy — recommend no-refund disclosure; confirm in Phase 4

## Decisions log (summary — full list in PROJECT.md)

26 decisions finalized, see `~/.claude/plans/effervescent-wibbling-breeze.md` §Decisions Finalized. Highlights:
- Telegram is IdP (no Supabase Auth)
- 12 fixed job categories, ESCO taxonomy
- Multi-profile per user with default
- Snapshot frozen at checkout click, immutable via DB trigger
- Stars primary + TON secondary + Stripe deferred
- TDD in `packages/core`, test-after + visual regression in UI
- Per-phase ritual mandatory
- 5 locales, wrap-first from Phase 1
- Zustand scoped strictly to wizard draft; other state layered
- Responsive UI Contract enforced from Phase 1

## Project memory

Persistent memory for this project lives in `docs/` (version-controlled) and in Claude's auto-memory (cross-session). See Per-Phase Ritual in REQUIREMENTS R-15.
