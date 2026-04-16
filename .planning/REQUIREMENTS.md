# AI Job Bot — Requirements

Scoped specifically for Mini App MVP. Downstream/worker requirements are out of scope.

## Functional Requirements

### R-1 — Telegram bot entry
- R-1.1 `/start` command — greet user, upsert `users` row, show inline [Open App] button
- R-1.2 `/new` — deep-link to `/campaign/new/wizard`
- R-1.3 `/profile` — deep-link to `/profile` (list of profiles)
- R-1.4 `/status` — text summary of last 3 campaigns + [Open App]
- R-1.5 `/help` — static text with commands + [Open App]
- R-1.6 Bot registered via BotFather in Phase 1 (not yet created)
- R-1.7 Webhook endpoint verifies `X-Telegram-Bot-Api-Secret-Token` header

### R-2 — Mini App authentication
- R-2.1 Client passes raw `initData` in `Authorization: Tma <initData>` header
- R-2.2 Server verifies HMAC-SHA256 (secretKey = sha256("WebAppData" + BOT_TOKEN))
- R-2.3 Rejects if signature invalid OR `auth_date > 24h` (`> 1h` for payment endpoints)
- R-2.4 `users.id` resolved from `telegram_id`, JWT signed with `{ sub: users.id, role: 'authenticated', exp: now+15min }`
- R-2.5 JWT passed to `supabase-js` via `setSession()`; all subsequent reads/writes pass RLS
- R-2.6 Silent re-auth on 401 by re-sending initData
- R-2.7 `initDataUnsafe` never trusted

### R-3 — Locale detection & switching
- R-3.1 On first `/start`, `users.locale` auto-detected from `initData.user.language_code`
- R-3.2 Supported: `en | uk | ru | it | pl`. Fallback to `en` for unsupported codes
- R-3.3 User can override in Settings (Phase 5)
- R-3.4 All user-facing strings via `next-intl` `t()` keys (enforced Phase 1+)

### R-4 — Profile management (multi-profile per user)
- R-4.1 User may have multiple profiles, one marked `is_default: true` (partial unique index)
- R-4.2 Profile required before campaign creation (minimal fields: `name`, `headline`, `skills[]`, seniority)
- R-4.3 Profile has universal fields (contacts, summary, years_total) + category-specific fields (stack for tech, tools for design, etc.)
- R-4.4 Profile editable before/between campaigns. Immutable after paid campaign refers to it (via snapshot).
- R-4.5 User can create / rename / set-default / delete profiles via Phase 5 manager
- R-4.6 Profile name ≤ 40 chars

### R-5 — AI resume parse
- R-5.1 Accept PDF or LinkedIn URL
- R-5.2 PDF → text via `unpdf`; fallback to Anthropic Files API for edge cases
- R-5.3 Parse via Claude Sonnet 4.5 + tool use with category-specific schema (12 schemas, one per category)
- R-5.4 Anti-hallucination prompt: parse ONLY what's in the document
- R-5.5 Returns structured JSON → prefilled review screen
- R-5.6 User approves/edits → `profiles` row written
- R-5.7 Per-user rate limit: 60s cooldown between parses; file-hash cache prevents re-parse of identical PDFs

### R-6 — Campaign wizard
- R-6.1 Step 0 — profile + category picker (12 categories)
- R-6.2 Step 1 — target roles (ESCO autocomplete, max 5) + seniority multi-select
- R-6.3 Step 2 — countries (ISO multi-select, max 15, quick-picks "Any EU"/"Any") + work_modes (remote/hybrid/onsite, min 1) + timezone tolerance + relocation switch
- R-6.4 Step 3 — salary min USD (normalized) + display currency + negotiable switch + employment_types
- R-6.5 Step 4 — category-specific fields (Zod schema per category, dynamic form)
- R-6.6 Step 5 — spoken languages + exclude_keywords + exclude_companies (skippable)
- R-6.7 Step 6 — max_posting_age_days + target_quota slider + volume preview estimate ±40%
- R-6.8 Step 7 — summary + duplicate detection (similarity > 80% against last 3 paid → soft warning) + price breakdown
- R-6.9 Step 8 — checkout (Stars / TON)
- R-6.10 Back button on any step preserves state (Zustand + localStorage per user)
- R-6.11 [Save draft] produces `campaigns.status = draft`
- R-6.12 Wizard progress indicator (8 dots), click to return to pass step

### R-7 — Snapshot contract
- R-7.1 `campaigns.snapshot_data` JSONB with `schema_version: 1`, structure per `docs/integration/snapshot-schema-v1.json`
- R-7.2 Universal fields + `category_fields` (discriminated union)
- R-7.3 ISO codes everywhere (countries, languages, currencies); no free text for categorizable fields
- R-7.4 `snapshot_data` frozen at "Pay" button click — not earlier (profile editable until pay)
- R-7.5 Canonical JSON + SHA-256 → `campaigns.snapshot_hash`
- R-7.6 `hard_requirements[]` list + per-stack-item `is_hard` flag
- R-7.7 `locale_at_checkout` captured for downstream cover letter generation

### R-8 — Payments (Stars primary + TON secondary)
- R-8.1 Stars: `createInvoiceLink({ currency: 'XTR' })` → TG native invoice → `pre_checkout_query` → `successful_payment` webhook
- R-8.2 TON: `@tonconnect/ui-react` → on-chain tx → server-side verification via TON API
- R-8.3 `payments` row per attempt with `UNIQUE(provider, provider_charge_id)` for idempotency
- R-8.4 On success: `campaigns.status = paid`, `snapshot_data` freeze trigger engaged, `payment_succeeded` notification enqueued
- R-8.5 On fail: `campaigns.status` returns to `draft`, `payment_failed` notification enqueued
- R-8.6 No refunds in MVP (explicit disclosure on checkout)

### R-9 — Pricing
- R-9.1 Pure function `pricing(category, quota, complexity)` in `packages/core/domain/pricing.ts`
- R-9.2 Live price updated on every wizard step change
- R-9.3 `price_breakdown` JSONB preserves each multiplier for transparency
- R-9.4 Category rates hardcoded in Phase 3, tunable via env vars

### R-10 — Dashboard (Phase 5)
- R-10.1 List user's campaigns ORDER BY created_at DESC
- R-10.2 Status badges: draft / pending_payment / paid / running / completed / failed / cancelled / refunded
- R-10.3 Campaign detail shows snapshot (read-only for paid, edit for draft)
- R-10.4 Dashboard is default route for returning users (not onboarding)
- R-10.5 Cancel draft supported; paid+ non-cancellable in MVP

### R-11 — Notifications outbox
- R-11.1 All bot messages enqueue via `notifications` table (`sent_at IS NULL`)
- R-11.2 Worker (Vercel Cron / Supabase Scheduled Function) polls + sends + stamps
- R-11.3 MVP kinds: `payment_succeeded`, `payment_failed`. Others (campaign_started, campaign_progress, campaign_completed) defer until downstream lands.
- R-11.4 Failed sends log in `delivery_error`, retry with exponential backoff up to 5 attempts

### R-12 — Data transfer contract
- R-12.1 `v_paid_campaigns_for_worker` VIEW with projection (campaign_id, user_id, category, snapshot_data, snapshot_profile, quota, status, paid_at, started_at, created_at)
- R-12.2 Role `job_hunter_worker` granted SELECT on view + UPDATE on (`status`, `started_at`, `completed_at`, `applications_submitted`) only
- R-12.3 Trigger `enforce_snapshot_immutability` blocks UPDATE on snapshot / category / target_quota when status ∈ (paid, running, completed)
- R-12.4 GIN indexes on `snapshot_data jsonb_path_ops` + compound on `(category, status)` WHERE status IN ('paid', 'running') + `(paid_at DESC)` WHERE paid='paid'
- R-12.5 `docs/integration/snapshot-schema-v1.json` — JSON Schema publicly documented

### R-13 — Responsive UI Contract
- R-13.1 All screens render correctly at viewports: 320×568, 360×640, 375×667, 390×844, 414×896, 768×1024, 1280×720+
- R-13.2 No `100vh`; use `--tg-viewport-height` CSS var bound to `WebApp.viewportHeight`
- R-13.3 All text containers `min-w-0`; long strings wrap (`overflow-wrap-anywhere`) or truncate with tooltip
- R-13.4 No horizontal body scroll; horizontal lists are explicit `<HScroll>` components
- R-13.5 Layout primitives (`<Screen>`, `<Stack>`, `<Row>`, `<Section>`, `<Scroll>`, `<FieldGroup>`, `<Clamp>`) shipped in Phase 1
- R-13.6 Touch targets ≥ 44×44 px
- R-13.7 Safe areas respected (`env(safe-area-inset-*)`)
- R-13.8 Content never behind Telegram MainButton (96px bottom padding reserved)
- R-13.9 Biome lint blocks `w-[Npx]`, forbids unnannotated `fixed|absolute|translate`, requires `/* layout-safe: <reason> */`
- R-13.10 Playwright visual regression: 5 viewports × 2 themes × 3 locales per screen on PR

### R-14 — Testing discipline
- R-14.1 TDD enforced in `packages/core` (Biome rule: new source file requires paired test file)
- R-14.2 In-memory port fakes for all ports
- R-14.3 Property-based tests (fast-check) for pricing + state machine transitions + canonical JSON
- R-14.4 RLS policies tested against real Supabase local dev
- R-14.5 E2E Playwright test for primary flow per phase
- R-14.6 CI: unit < 5s, integration < 30s, E2E < 5min, visual < 10min

### R-15 — Per-phase ritual (acceptance)
- R-15.1 Code + tests green
- R-15.2 `docs/features/<name>.md` created/updated
- R-15.3 `docs/CHANGELOG.md` appended
- R-15.4 `docs/PROJECT-MAP.md` reflects new state
- R-15.5 `docs/SESSION-LOG.md` appended
- R-15.6 `CLAUDE.md` (root) updated if arch/rules changed
- R-15.7 ADR in `docs/DECISIONS/NNNN-*.md` if non-reversible decision made
- R-15.8 Auto-memory note saved if cross-session insight emerged
- R-15.9 `.planning/phase-N-verify.md` shows proof of working outcome
- R-15.10 Typecheck + build + lint green

## Non-Functional Requirements

### NFR-1 — Performance
- Mini App TTI ≤ 2s on 3G (Lighthouse Mobile score ≥ 90)
- Resume parse response ≤ 15s p95
- Wizard step transitions ≤ 200ms
- RSC streaming used where possible

### NFR-2 — Security
- Service-role Supabase key in `server-only` modules; Biome rule blocks client-side import
- RLS policies on every table (`user_id = auth.uid()`)
- initData freshness enforced (1h for payment endpoints, 24h read-only)
- No secrets in client bundle; boot-time env validation (`@t3-oss/env-nextjs`)
- Storage buckets private (signed URLs only)
- GDPR: user deletion cascades all PII except anonymized `payments` rows
- Payment webhook idempotency (`UNIQUE(provider, provider_charge_id)`)

### NFR-3 — Reliability
- Webhook retries up to 3× with exponential backoff (Telegram does it naturally, but our handler idempotent)
- Notification outbox with 5 retry attempts + delivery_error logging
- Anthropic rate limit → per-user 60s cooldown + file-hash cache
- Sentry integration from Phase 1

### NFR-4 — Scalability
- Supabase Pro tier sufficient for MVP (up to ~1M rows); escalation plan documented in RUNBOOK
- Vercel Pro for web; bot webhook on Node runtime (grammY compatibility)
- GIN indexes on `campaigns.snapshot_data` for worker queries
- No N+1 patterns (enforced by review)

### NFR-5 — Internationalization
- 5 locales wrap-first from Phase 1
- Phase 6 translations via LLM + human review (EU-market quality)
- Locale stress test in visual regression (EN + RU-long + x-loud pseudo-locale)
- No bare strings in user-facing components (lint-enforced)

### NFR-6 — Accessibility
- Keyboard navigation works (where applicable — Telegram Mini App is mostly touch)
- `prefers-reduced-motion` respected (animations ≤ 200ms, skippable)
- Color contrast WCAG AA (Telegram themeParams dark+light tested)
- Screen reader baseline (aria-label on interactive elements)
- `gsd:ui-review` in Phase 6 audits all above

### NFR-7 — Observability
- Sentry for errors (FE + API)
- Structured logging via `apps/web/lib/logger.ts`
- Key events logged: auth success/fail, payment flow transitions, resume parse results, webhook receive/process
- Dashboard of key metrics in Phase 7 runbook

### NFR-8 — Developer experience
- `pnpm dev` works out of the box after `.env` + Supabase local setup
- `CLAUDE.md` + `PROJECT-MAP.md` + latest CHANGELOG = full cold-boot context
- Biome gives instant feedback; no ESLint+Prettier dance
- Type-safe across FE + BE via shared `packages/core` types + Supabase generated types
