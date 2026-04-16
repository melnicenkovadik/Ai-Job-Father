# AI Job Bot — Telegram Mini App

**Status:** Active (started 2026-04-16)
**Repo:** `/Users/vadymmelnychenko/Projects/ai-job-bot/`
**Owner:** Vadym Melnychenko (`melnicenkovadik@gmail.com`, `@melnychenkovad`)
**Plan file:** `~/.claude/plans/effervescent-wibbling-breeze.md` (authoritative, consult before any phase)

## Elevator

Multi-category Telegram Mini App для поиска работы. Юзер онбордится через Telegram, загружает резюме (AI парсит через Claude Sonnet 4.5), конфигурирует платную «job search campaign» (категория из 12 фикс, позиции, страны, квота, стек), оплачивает через Telegram Stars или TON, snapshot замораживается и пишется в shared Supabase. Отдельный downstream сервис (эволюция `/Users/vadymmelnychenko/Projects/job-hunter`) потом подхватывает paid кампании и делает реальный скрапинг/apply — вне MVP scope.

**MVP guardrail:** onboarding → profile → campaign config → payment → DB write. Всё что не ведёт к paid snapshot в БД — отложено.

## Value prop

- **AI-parsed resume** — загрузил PDF/LinkedIn, бот заполнил профиль сам (Claude Sonnet 4.5 + tool use + category-specific prompts)
- **Multi-category** — 12 фикс категорий (Tech / Design / Marketing / Sales / Product / Finance / HR / Support / Content / Ops / Data / Web3) с категорно-специфичными полями и валидацией
- **ESCO taxonomy** — автокомплит ролей из европейского стандарта (3000+ ролей, 27 локализаций)
- **Native Telegram payments** — Stars (XTR) + TON Connect, без карт и аккаунтов
- **Multilingual** — 5 локалей (EN / UK / RU / IT / PL), auto-detect от Telegram
- **No fabrication** — AI cover letters и snapshot используют только данные резюме, phase 2 enforced

## Core constraints (non-negotiable)

1. **Claude owns the project** — документация достаточна для возобновления работы в новой сессии без потери контекста
2. **Per-feature docs** — каждая фича ships with `docs/features/<name>.md`
3. **Clean Architecture** — domain / application / infrastructure / presentation, enforced Biome-правилами
4. **Next.js 15 App Router, feature-modular** folder structure
5. **Frontend best practices 2026** — TS strict, RSC-default, Tailwind v4, shadcn in-tree
6. **Max UI/UX quality** — `frontend-design:frontend-design` skill для UI фаз; `gsd:ui-phase` для 2/3/5; `gsd:ui-review` для 6
7. **Responsive UI Contract** — viewport matrix (320→1280+), locale stress (5 языков), layout primitives (`<Screen>/<Stack>/<Clamp>`), Biome-правила против `100vh|w-[Npx]|fixed без rationale`, Playwright visual regression 18 скриншотов/экран
8. **TDD в `packages/core`** — red → green → refactor, enforced Biome правилом; UI тест-after с visual regression
9. **Per-phase ritual** — feature doc + CHANGELOG + PROJECT-MAP + SESSION-LOG + ADR если надо + memory-note если надо + verification proof
10. **5 locales wrap-first** — Phase 1+ никаких bare-строк, `t()` везде; переводы приземляются Phase 6
11. **Pay-per-run billing** — каждая кампания отдельная оплата, immutable snapshot после paid
12. **No deadline** — quality > speed

## Stakeholders

- **Primary user:** job seekers across 12 categories, tech-literate (Telegram-комфорт, ≥C1 в одной из 5 локалей)
- **Primary market:** UA / CEE / EU + US remote-friendly
- **Owner:** solo (Vadym) — Claude делает имплементацию по планам
- **Downstream consumer:** future job-hunter evolution (читает `v_paid_campaigns_for_worker` view)

## Tech identity

- Next.js 15 App Router + TS strict + Tailwind v4 + shadcn
- pnpm workspaces + Turborepo 2 monorepo (`apps/web` + `packages/core` + `packages/db`)
- Supabase Postgres + Storage + RLS
- Anthropic Claude Sonnet 4.5 (resume parse, tool use, prompt caching)
- grammY 1.30+ (Telegram bot webhook)
- Telegram Stars (primary) + TON Connect (secondary)
- Biome 1.9+ (lint + format + layer boundaries)
- Vitest 2 + Playwright 1.49+ (unit / integration / E2E / visual regression)
- Sentry (errors), Vercel (deploy), `@t3-oss/env-nextjs` (env validation)

## Success criteria (MVP-level)

- User starts bot → Mini App opens → localized greeting → `users` row exists
- User uploads resume → AI parses → review → profile saved (category-aware)
- User runs wizard → dynamic price → `campaigns (draft)` with correct `snapshot_data` shape
- User pays via Stars OR TON → `campaigns.status=paid`, `snapshot_hash` set, immutability trigger engaged
- Bot sends confirmation push
- Dashboard lists user's campaigns with status
- 5 languages live (via `next-intl`), Telegram theme parity, a11y audit pass
- Production deployed, `v_paid_campaigns_for_worker` VIEW documented and accessible to downstream role

## Out of MVP (explicit deferrals)

- Scraping / matching / auto-apply / cover letter generation (все downstream)
- B2B / employer side
- Stripe (после Stars+TON validation)
- Paid categories beyond those with downstream scrapers (Mini App принимает все 12, readiness decision — downstream concern)
- Refund flow (recommend no-refund disclosure в MVP)
- Custom domain (Vercel `*.vercel.app` пока)

## Key decisions (from plan file — see there for full reasoning)

All numbered decisions in `Decisions Finalized` section of the plan. Most critical:

- One Next.js deployment hosts both bot webhook and Mini App
- Telegram is IdP (no Supabase Auth) — initData HMAC → signed Supabase JWT → RLS
- Shared Supabase with downstream; Mini App writes, downstream reads via view
- Multi-profile per user (partial unique index on `is_default`)
- Snapshot frozen at checkout click (not draft create) — edits to profile before pay ok, after pay immutable
- ESCO taxonomy for target roles
- Max 5 target_roles per campaign
- One category = one campaign (multi-category intent = multiple campaigns)
- Hard/soft requirements только на seniority/countries/salary/stack-item
- Volume preview formula (pure function), не SQL
- Immutable snapshot через Postgres trigger
- `v_paid_campaigns_for_worker` view как публичный downstream API
- Schema-versioned snapshot (`schema_version: 1`)
- Zustand scoped strictly to wizard draft; server state → TanStack Query; URL для nav

## Next action

Phase 0 (scaffolding) — `/gsd:plan-phase 0`. Target: `pnpm dev` runs empty app, CI green, Supabase linked.
