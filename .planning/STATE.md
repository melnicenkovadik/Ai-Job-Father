# Project State

**Last updated:** 2026-04-17
**Current phase:** Phase 1 shipped (code + docs + Cloud migrations). BotFather menu button
+ real-device flow are the only open Phase-1 checkpoints (user-gated).
**Plan file:** `~/.claude/plans/effervescent-wibbling-breeze.md`
**Wizard compression addendum:** `~/.claude/plans/lucky-noodling-pike.md` (approved
2026-04-17 — 8-step wizard → 3 screens via progressive disclosure; data contract unchanged)

## Where we are

**Phase 0 ✅ shipped 2026-04-16** (38 commits). See `.planning/phases/0/verify.md`.

**Phase 1 ✅ code + docs shipped 2026-04-17** (13+ additional commits on 2026-04-17 on top
of the Phase-1 work done in the earlier session).

Shipped 2026-04-17 (this session):
- `(app)` route group with NextIntl + TelegramProvider + greeting home (`/` now serves
  `app/(app)/page.tsx`; root `app/page.tsx` deleted)
- `ThemeBridge`, `AuthGate`, `TelegramProvider`, `query-client`, `useSession` hook
- `webapp.ts` typed accessor for `window.Telegram.WebApp`
- `(dev)/layout.tsx` + `(dev)/ui-contract/page.tsx` visual-regression fixture
- 5 locale files gained `home.fallbackName` + `home.phaseNote` keys
- `docs/features/{auth-skeleton,ui-contract,i18n-skeleton,bot-commands}.md`
- `docs/DECISIONS/{0004-telegram-initdata-auth,0005-responsive-ui-contract}.md`
- `docs/CHANGELOG.md` Phase 1 section appended
- `docs/PROJECT-MAP.md` rewritten to v1
- `docs/SESSION-LOG.md` 2026-04-17 entry appended
- `CLAUDE.md` §6 / §7 / §18 / §19 / §20 updates
- `biome.json` test-file override (+ workspace-wide `biome check --fix --unsafe` pass)
- Supabase Cloud migrations applied: `users` + RLS (`supabase db push --db-url <pooler>`)
- `origin` remote added + all commits pushed to `github.com:melnicenkovadik/Ai-Job-Father`

Already present from earlier sessions:
- Core domain: `user`, `locale`, `upsertUser` (+ tests)
- Infra: `verify-init-data`, `session`, `bot`, `auth-middleware`, `jwt`, Supabase clients,
  `SupabaseUserRepo`
- API routes: `/api/auth/session`, `/api/bot/webhook`, `/api/health`
- 8 layout primitives in `apps/web/components/ui/layout/`
- next-intl 5-locale wiring + `LocaleSwitcher`
- `scripts/set-webhook.ts`

## What's next

1. User checkpoints (Phase 1 Wave K — see `docs/SESSION-LOG.md` 2026-04-17 entry):
   - BotFather `/setmenubutton` with Vercel URL
   - `pnpm tsx scripts/set-webhook.ts` with prod URL
   - Real `/start` on phone → screenshots into `.planning/phases/1/verify.md`
2. Phase 2 (`/gsd:ui-phase 2` + `/gsd:plan-phase 2`) — Profile + AI resume parse.
3. Phase 3 (`/gsd:ui-phase 3` + `/gsd:plan-phase 3`) — 3-screen wizard (per approved
   compression spec in `~/.claude/plans/lucky-noodling-pike.md`).
4. Phase 4, 5, 6, 7 per `.planning/ROADMAP.md`.

## Key references (for new sessions)

1. **Rules first:** `/CLAUDE.md` (20 sections as of 2026-04-17).
2. **Current state:** `docs/PROJECT-MAP.md` v1.
3. **Latest narrative:** `docs/CHANGELOG.md` Phase 1 entry + `docs/SESSION-LOG.md`
   2026-04-17.
4. **Full design:** `~/.claude/plans/effervescent-wibbling-breeze.md`
   + `~/.claude/plans/lucky-noodling-pike.md` (wizard compression addendum).
5. **Scope:** `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`.
6. **Phase proofs:** `.planning/phases/0/verify.md` (shipped), `.planning/phases/1/verify.md`
   (shipped after user checkpoints pass).

## Open questions (non-blocking)

1. Pricing tiers — propose in Phase 3 planning.
2. Resume retention — recommend purge raw PDF at 90d post-parse; confirm in Phase 2.
3. Refund policy — recommend no-refund disclosure; confirm in Phase 4.
4. Whether to run Phase 2 UI spec + Phase 3 data-layer TDD in parallel tracks.

## Decisions log (summary)

26 decisions finalized in `~/.claude/plans/effervescent-wibbling-breeze.md`
§Decisions Finalized. Phase 1 added D1.1-D1.22 (see `.planning/phases/1/PLAN.md` §1).
Wizard compression additions (2026-04-17) live in `lucky-noodling-pike.md`.

## Project memory

- Per-project auto-memory: `~/.claude/projects/-Users-vadymmelnychenko-Projects-ai-job-bot/memory/`
  (`feedback_git_identity.md`, `feedback_no_security_nagging.md`).
- Version-controlled memory: `docs/CHANGELOG.md`, `docs/SESSION-LOG.md`,
  `docs/PROJECT-MAP.md`, `docs/features/*.md`, `docs/DECISIONS/*.md`.
