# Project State

**Last updated:** 2026-04-16
**Current phase:** Pre-Phase-0 (intake done, awaiting `/gsd:plan-phase 0`)
**Plan file:** `~/.claude/plans/effervescent-wibbling-breeze.md`

## Where we are

Intake (`/gsd:new-project`) complete. All artifacts written:
- `.planning/PROJECT.md` — project context + decisions summary
- `.planning/config.json` — workflow preferences
- `.planning/REQUIREMENTS.md` — R-1 through R-15 + NFR-1 through NFR-8
- `.planning/ROADMAP.md` — 8 phases with observable outcomes and tasks
- `.planning/STATE.md` — this file

## What's next

1. `/gsd:plan-phase 0` — generates `.planning/phases/0/PLAN.md` for scaffolding
2. Execute Phase 0 via `/gsd:execute-phase 0`
3. `/gsd:verify-work 0` — confirm outcome + ritual artifacts
4. Repeat for phases 1 through 7
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
