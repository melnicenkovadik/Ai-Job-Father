# Feature: i18n Skeleton (next-intl + 5 locales)

**Phase:** 1
**Status:** Shipped 2026-04-17 (skeleton; real translations land in Phase 6)
**Owner:** Claude (solo implementation)

## Purpose

Establish the wrap-first i18n discipline from Phase 1, so every user-facing string is
localisable from day one. Real translations land in Phase 6 via LLM + native-speaker review;
Phases 1-5 ship with English strings plus `[LOCALE] ...` placeholders in UK/RU/IT/PL that keep
the `messages-parity` test passing while making missing translations visually obvious during
dev.

## Locales

| Code | Label | Status | Notes |
|---|---|---|---|
| `en` | English | complete (source of truth) | Every phase's real copy |
| `uk` | Українська | placeholder | `[UK] ...` prefixes until Phase 6 |
| `ru` | Русский | placeholder | `[RU] ...` |
| `it` | Italiano | placeholder | `[IT] ...` |
| `pl` | Polski | placeholder | `[PL] ...` |

Locale detection priority (first match wins, `app/i18n/request.ts`):
1. `locale` cookie (set by Phase 5 Settings page or the dev LocaleSwitcher).
2. Accept-Language header first tag.
3. Fallback `en`.

Phase 5 will add a fourth priority above (1): the authenticated user's `users.locale` column,
set on first `/start` from `initData.user.language_code` via `detectLocale`.

## Structure

- `apps/web/messages/{en,uk,ru,it,pl}.json` — flat key trees, grouped by feature.
- `apps/web/app/i18n/request.ts` — `getRequestConfig` resolving locale + dynamically importing
  the matching message file.
- `apps/web/components/i18n/LocaleSwitcher.tsx` — dev-only 5-button switcher setting the
  cookie + reloading.
- `apps/web/middleware.ts` — minimal pass-through that forwards locale hints (keeps the door
  open for `createMiddleware` from `next-intl/middleware` when we need path-based locale
  routing — Phase 6).

## Key Trees (Phase 1 inventory)

```
home.greeting           — "Hi, {name}!"
home.description        — one-sentence description
home.fallbackName       — used when initData has no first_name / username
home.phaseNote          — phase-progress hint on the greeting page
home.cta.create_campaign — for Phase 2+
auth.loading            — "Authenticating..."
auth.error.generic      — unknown server error
auth.error.missing_init_data — app opened outside Telegram
auth.error.stale_init_data   — initData > 24h old
auth.error.invalid_signature — HMAC mismatch (tampered)
auth.error.malformed_init_data — parse failure
auth.retry              — retry button
common.loading / common.error / common.retry — generic
```

Phase 2 will add `profile.*` keys; Phase 3 adds `campaign.*`, `category.*`, `wizard.*`; etc.

## Parity Test

`apps/web/messages/messages-parity.test.ts` (2 cases) asserts:
1. All 5 locale files parse as JSON.
2. Their key trees are symmetric — adding a key to `en.json` without adding it to `uk.json`
   fails the test (and therefore the PR).

This is the single mechanism keeping the "add a key and forget to wire the other locales"
bug from surviving to production.

## Biome Discipline

Biome 1.9 doesn't ship a built-in "no bare user-facing strings" rule. Per D1.10 we enforce
the rule **by review** (documented in CLAUDE.md §6) and by the fact that the greeting screen
itself passes `t(...)` — any PR introducing a bare string will fail code review. A custom
Biome plugin is a Phase 6 polish task; it's a cost we pay later because the manual rule holds
for a solo Claude+user workflow.

## Critical Files

- `apps/web/messages/en.json` (+ `uk.json`, `ru.json`, `it.json`, `pl.json`)
- `apps/web/messages/messages-parity.test.ts`
- `apps/web/app/i18n/request.ts`
- `apps/web/app/middleware.ts`
- `apps/web/components/i18n/LocaleSwitcher.tsx`
- `packages/core/src/domain/locale.ts` — `Locale` type, `SUPPORTED_LOCALES`, `detectLocale`
- `apps/web/app/(app)/layout.tsx` — mounts `NextIntlClientProvider`

## Open Follow-ups

- **Phase 2-5**: add feature-scoped keys as screens ship. Keep all 5 locale files in sync via
  the parity test.
- **Phase 5**: Settings page sets `locale` cookie via server action; also writes to
  `users.locale` so server-rendered routes pick the right locale via DB.
- **Phase 6**: real translations. LLM + native-speaker QA. Pseudo-locale `x-loud` added to
  visual regression matrix (EN + padding + accents) to stress-test fixed widths.
- **Phase 6**: custom Biome plugin / codemod for "no bare strings".
