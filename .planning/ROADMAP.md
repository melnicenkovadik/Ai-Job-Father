# AI Job Bot — Roadmap

8 phases, coarse granularity, no deadline, quality-first. Per-phase ritual (see REQUIREMENTS R-15) is mandatory gate before moving to next phase.

UI phases (2, 3, 5) use `/gsd:ui-phase N` — design contract before code via `frontend-design` skill.
UI review (6) uses `/gsd:ui-review` — systematic audit.

## Phase 0 — Bootstrap & scaffolding [infra]

**Observable outcome:** `pnpm dev` runs empty app, `GET /api/health` returns 200, CI green, Supabase linked.

**Key tasks:**
- Monorepo scaffold (pnpm + Turborepo; `apps/web`, `packages/core`, `packages/db`)
- Next.js 15 App Router baseline (`app/layout.tsx`, `app/page.tsx`, health route)
- TS strict config (noUncheckedIndexedAccess, exactOptionalPropertyTypes)
- Biome 1.9+ with layer-boundary `noRestrictedImports` rules
- Tailwind v4 + CSS vars bound to placeholder Telegram themeParams
- `@t3-oss/env-nextjs` with Zod boot-time validation
- Supabase project created, CLI linked, first migration (empty schema)
- GitHub repo + `.github/workflows/ci.yml` (typecheck + lint + build + unit tests)
- `CLAUDE.md` (root constitution), `README.md`, `.env.example`, `.gitignore`
- `docs/ARCHITECTURE.md` + ADRs 0001/0002/0003 (Next.js host / Supabase shared / Clean Architecture)
- Remove empty `fe/` (replaced by `apps/web`)

**Artifacts (ritual):** feature doc `bootstrap.md`, CHANGELOG, PROJECT-MAP v0, SESSION-LOG, phase-0-verify.md

## Phase 1 — Bot + Mini App skeleton + auth [backend + light UI]

**Observable outcome:** `/start` in Telegram → Mini App opens → localized greeting → `users` row upserted. Bot commands (`/start /new /profile /status /help`) registered via BotFather. Responsive UI Contract primitives shipped.

**Key tasks:**
- BotFather: create bot, get token, set Mini App URL
- `apps/web/lib/telegram/verify-init-data.ts` — HMAC verification (TDD'd in core where logic allows)
- `apps/web/app/api/auth/session/route.ts` — initData → Supabase JWT
- `apps/web/app/api/bot/webhook/route.ts` — grammY handler + command routing
- `apps/web/lib/telegram/bot.ts` + `auth-middleware.ts` + `session.ts`
- `apps/web/app/(app)/layout.tsx` — TelegramProvider + Query + i18n + theme bridge
- `packages/core/src/domain/user.ts` + `application/upsert-user.ts` + port
- Supabase migration: `users` table + RLS
- next-intl setup with 5 locale skeletons (keys exist, translations only in EN)
- Auto-detect locale from `initData.user.language_code`
- **Responsive UI Contract primitives:** `<Screen>`, `<Stack>`, `<Row>`, `<Section>`, `<Scroll>`, `<FieldGroup>`, `<Clamp>` — shipped with visual regression fixtures
- Biome layout rules activated (`w-[Npx]`, `100vh`, `fixed` without rationale)
- Playwright visual regression baseline (1 empty greeting screen × 5 viewports × 2 themes × 3 locales)
- `scripts/set-webhook.ts` — register webhook URL (one-off)
- `docs/features/auth-skeleton.md` + `docs/features/ui-contract.md`
- `docs/DECISIONS/0004-telegram-initdata-auth.md`
- `docs/DECISIONS/0005-responsive-ui-contract.md`

**Artifacts (ritual):** 2 feature docs, CHANGELOG, PROJECT-MAP v1, SESSION-LOG, 2 ADRs, phase-1-verify.md (proof: `/start` → users row)

## Phase 2 — Profile + AI resume parse (multi-profile) [UI-phase]

**Observable outcome:** User uploads PDF → AI parses → review screen → approves → `profiles` row written. Supports multiple profiles per user with one default. Profile manager UI (create / rename / set-default / delete).

**Uses `/gsd:ui-phase 2`** — design contract via `frontend-design` skill before code.

**Key tasks:**
- Supabase migration: `profiles` table (multi-per-user, partial unique on `is_default`) + RLS
- Storage bucket `resumes` with private + signed URL policy
- `packages/core/src/domain/profile.ts` + `category-fields/<12>.ts` (Zod schemas, discriminated union)
- `packages/core/src/application/parse-resume.ts` + `save-profile.ts` + ports
- Anthropic SDK client + Claude Sonnet 4.5 tool-use integration for structured parse
- Per-category parse prompts (12 templates with category-specific schemas)
- PDF → text via `unpdf`; fallback to Anthropic Files API
- File-hash cache + 60s per-user cooldown
- Profile list UI + editor (per-profile) + manager (create / rename / default / delete)
- Minimum required fields: `name`, `headline`, `skills[]`, seniority
- AI review screen: diff between parsed and existing, approve/reject per field
- LinkedIn URL → scrape+parse (if time permits, else defer)
- `docs/features/profile-multi.md` + `docs/features/resume-parse.md`

**Artifacts (ritual):** 2 feature docs, CHANGELOG, PROJECT-MAP v2, SESSION-LOG, ADRs if any, visual regression baselines for all profile screens, phase-2-verify.md

## Phase 3 — Campaign wizard [UI-phase]

**Observable outcome:** User completes 8-step wizard → `campaigns (draft)` row with valid `snapshot_data` ready for checkout. Volume preview + duplicate detector + hard/soft toggles work.

**Uses `/gsd:ui-phase 3`** — design contract first.

**Key tasks:**
- Supabase migration: `campaigns` table (with `snapshot_data`, `snapshot_hash`, `category` column) + trigger + indexes + view stubs + RLS
- `packages/core/src/domain/snapshot/` (schema, canonicalize, hash, validate) — full TDD
- `packages/core/src/domain/job-category.ts`
- `packages/core/src/domain/taxonomy/esco.ts` port + first infrastructure adapter
- Supabase migration: `esco_cache` table
- `packages/core/src/domain/volume-estimate.ts` — pure function, property-based tested
- `packages/core/src/domain/pricing.ts` — pure function, property-based tested
- `packages/core/src/domain/dedup.ts` — canonical hash + similarity
- `packages/core/src/application/create-campaign.ts` + `save-draft.ts` use cases
- Zustand wizard store (single narrow store) + persist middleware + per-user key
- 8-step wizard UI (each step is a route segment)
- Category-specific field forms (dynamic from `category_fields/<category>.ts` schemas)
- ESCO autocomplete component (with local cache + online fallback)
- Live price + volume estimate widgets
- Duplicate detector with soft warning on Step 7
- Hard/soft requirement toggles on seniority/countries/salary/stack
- `docs/features/campaign-wizard.md` + `docs/features/snapshot-contract.md` + `docs/features/esco-taxonomy.md`
- `docs/integration/snapshot-schema-v1.json` — published JSON Schema

**Artifacts (ritual):** 3 feature docs, CHANGELOG, PROJECT-MAP v3, SESSION-LOG, ADRs (ESCO choice, snapshot shape), visual regression for all wizard steps × 3 locales, phase-3-verify.md

## Phase 4 — Payments — Stars + TON [backend + UX]

**Observable outcome:** User pays via Stars OR TON → `campaigns.status = paid` → `snapshot_data` frozen (immutability trigger engaged) → bot sends `payment_succeeded` push.

**Key tasks:**
- Supabase migration: `payments` table + `UNIQUE(provider, provider_charge_id)` + RLS
- Trigger `enforce_snapshot_immutability()` deployed
- `v_paid_campaigns_for_worker` VIEW + `job_hunter_worker` role with narrow grants
- `packages/core/src/domain/payment.ts` + state machine
- `packages/core/src/application/freeze-snapshot-at-checkout.ts` + `confirm-stars-payment.ts` + `verify-ton-payment.ts`
- `apps/web/lib/payments/stars.ts` — grammY `createInvoiceLink` + `pre_checkout_query` + `successful_payment` handlers
- `apps/web/lib/payments/ton.ts` — TonConnect SDK + on-chain verification via TON API
- `apps/web/app/(app)/checkout/` flow (Stars + TON branches)
- `apps/web/app/api/payments/stars-preflight/route.ts` + `ton-verify/route.ts`
- Notification outbox writer for `payment_succeeded` + `payment_failed`
- E2E Playwright: complete wizard with mocked initData → mocked Stars invoice → webhook → status=paid (idempotency replay included)
- `docs/features/payments-stars.md` + `docs/features/payments-ton.md` + `docs/features/snapshot-immutability.md`
- `docs/DECISIONS/0006-payments-stars-primary-ton-secondary.md`

**Artifacts (ritual):** 3 feature docs, CHANGELOG, PROJECT-MAP v4, SESSION-LOG, 1 ADR, E2E tests green, phase-4-verify.md

## Phase 5 — Dashboard & notifications [UI-phase]

**Observable outcome:** Returning users see dashboard with all their campaigns + statuses. Bot sends push notifications on payment events. Profile manager fully functional. Settings page (language override) live.

**Uses `/gsd:ui-phase 5`** — design contract first.

**Key tasks:**
- Supabase migration: `notifications` table (outbox)
- `packages/core/src/application/enqueue-notification.ts` + `bot-notifier` port
- Notification worker route `apps/web/app/api/notifications/cron/route.ts` (Vercel Cron)
- Dashboard UI (returning-user default route): list campaigns, status badges, filters (category, status)
- Campaign detail view: read-only snapshot display for paid, editable for draft
- Profile manager UI (create / rename / set-default / delete with confirmations)
- Settings page: language override, timezone override, account delete (GDPR)
- Account delete cascades everywhere except anonymized `payments` rows
- `docs/features/dashboard.md` + `docs/features/notifications-outbox.md` + `docs/features/settings.md`

**Artifacts (ritual):** 3 feature docs, CHANGELOG, PROJECT-MAP v5, SESSION-LOG, visual regression baselines, phase-5-verify.md

## Phase 6 — i18n + a11y + theme polish [polish / `gsd:ui-review`]

**Observable outcome:** 5 languages live with real translations. Telegram theme parity (dark/light flawless). Accessibility audit passes. All screens pass visual regression across full locale × viewport × theme matrix.

**Uses `/gsd:ui-review`** — systematic audit.

**Key tasks:**
- LLM-assisted translations for all 5 locales + human review (native speakers for UK/RU/IT/PL)
- Locale stress test: verify no string overflow in RU/IT (longest) + no spacing issues in CJK-style overflow
- Tailwind v4 `@theme` CSS vars → Telegram themeParams bridge validation (light + dark)
- `prefers-reduced-motion` verified on every animation
- WCAG AA contrast check on every UI token
- Tap targets audit (min 44×44)
- Screen reader baseline on interactive elements
- i18n completeness audit: no missing keys, no bare strings
- Visual regression coverage: 18 screenshots per screen across full matrix
- `docs/features/i18n-complete.md` + `docs/features/a11y-audit.md`

**Artifacts (ritual):** 2 feature docs, CHANGELOG, PROJECT-MAP v6, SESSION-LOG, `docs/UI-REVIEW.md` audit report, phase-6-verify.md

## Phase 7 — Production hardening & handoff [ops]

**Observable outcome:** Production deployed. Rate limits active. Sentry live. RUNBOOK complete. `v_paid_campaigns_for_worker` contract formally documented. Downstream can begin work independently.

**Key tasks:**
- Vercel production deployment + custom domain (optional)
- Supabase production project (EU-central Frankfurt recommended)
- Rate limits on all API routes (per-user + per-IP)
- Sentry integration + source maps + error budget
- Webhook URL pinned to prod (not preview)
- Secrets rotated; service-role key audited for client-side leakage (grep + Biome + runtime check)
- `docs/RUNBOOK.md` — deploy, secret rotation, bot outage recovery, rollback procedures
- `docs/integration/job-hunter-contract.md` — full downstream contract (schema, state machine, owned-by matrix, `job_hunter_worker` role access)
- GDPR: user deletion flow documented + tested; data retention policy (raw PDF purged at `resume_parsed_at + 90d`)
- Load test (k6 or artillery): 100 concurrent users × wizard flow × payment happy path
- Backup verification: Supabase automated backups tested
- `docs/features/production-hardening.md`
- `docs/DECISIONS/0007-production-architecture.md`

**Artifacts (ritual):** 1 feature doc, CHANGELOG, PROJECT-MAP v7 (final MVP state), SESSION-LOG, 1 ADR, RUNBOOK, job-hunter-contract.md, phase-7-verify.md

## Phase flow diagram

```
Phase 0 ────→ Phase 1 ────→ Phase 2 ────→ Phase 3 ────→ Phase 4 ────→ Phase 5 ────→ Phase 6 ────→ Phase 7
scaffolding   auth + UI     profiles +    campaign      payments      dashboard +   polish +      prod +
              contract      AI parse      wizard        + snapshot    notif         i18n          handoff
                            [UI-phase]    [UI-phase]    freeze        [UI-phase]    [UI-review]
```

Each arrow is gated by Per-Phase Ritual acceptance.

## Milestone check

MVP = end of Phase 7. `/gsd:complete-milestone` ships:
- Working Telegram bot + Mini App in 5 languages
- 12 categories supported at data level
- Stars + TON payments working
- Dashboard + push notifications live
- Downstream contract documented and signed
- Observability + RUNBOOK + GDPR compliance in place

Post-MVP options (separate roadmaps):
- Downstream worker expansion (category-by-category scraper rollout)
- Stripe payment rail
- B2B / employer side
- Refund flow
- Custom domain + marketing site
- Affiliate / referral program
