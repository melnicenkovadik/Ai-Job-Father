# Feature: Responsive UI Contract

**Phase:** 1
**Status:** Shipped 2026-04-17 (primitives + fixture)
**Owner:** Claude (solo implementation)

## Purpose

Guarantee zero overflow / clipping / overlap regressions across Telegram's matrix of devices,
themes, locales, and dynamic viewport (keyboard). Frontend code written in later phases never
has to re-learn "how do I make this not break on 320px in Polish with the keyboard open" —
they compose these primitives, which have the invariants already baked in.

Shipped as `apps/web/components/ui/layout/` (8 primitives) + `/ui-contract` dev fixture +
Biome rules + Playwright visual regression setup (baseline lands in Wave H).

## Contract Goals (R-13 in `.planning/REQUIREMENTS.md`)

| Rule | Enforcement |
|---|---|
| No fixed-pixel widths on container components | Biome rule forbids `w-\[\d+px\]` outside `components/ui/*` primitives |
| `min-w-0` on every text-carrying flex child | Baked into `<Stack>` / `<Row>` / `<Clamp>` / `<FieldGroup>` |
| Long strings wrap, don't overflow horizontally | `[overflow-wrap:anywhere]` on body text; `truncate` + tooltip on single-line labels |
| No horizontal body scroll | `overflow-x-hidden` on `<Screen>`; any horizontal list is explicit `<HScroll>` |
| Safe areas respected | `env(safe-area-inset-*)` applied on `<Screen>` |
| Telegram keyboard shift handled | `--tg-viewport-height` bound in `<ThemeBridge>` on every `viewportChanged` |
| Content never behind Telegram MainButton | `<Screen reserveMainButton>` defaults `true` — 96px bottom padding reserved |
| Touch targets ≥ 44×44 px | `min-h-[2.75rem]` on interactive primitives |
| Line clamp for user-generated / AI output | `<Clamp lines={N}>` with optional "show more" |

## Primitives

All exported from `@/components/ui/layout`.

### `<Screen reserveMainButton>`
Root of every Mini App route. Sets `min-h` to `--tg-viewport-height`, fills background from
`--color-bg`, hides horizontal overflow, applies safe-area padding, reserves 96px bottom when
`reserveMainButton` (default true — disable on dev fixtures that don't render a MainButton).

### `<Stack gap={0|1|2|3|4|6|8}>`
Vertical flex column with `min-w-0` pre-applied. Gap-only spacing (never margins). `gap=3` is
the default — matches shadcn's default rhythm.

### `<Row gap={0|1|2|3|4|6|8}>`
Horizontal equivalent. Same `min-w-0` + gap semantics. Combine with `shrink-0` on trailing
elements (chips, icons) and `min-w-0 flex-1 truncate` on the leading label to get the "icon +
truncating label + trailing chip" row shape without drama.

### `<Section title>`
Titled content block with consistent vertical rhythm. Useful for wizard-step groupings,
profile sections, dashboard blocks.

### `<Scroll>`
The **only** owner of `overflow-y: auto` in the system. Wrapping a long-form route inside
`<Scroll>` inside `<Screen>` keeps body-scroll strictly disabled (the app doesn't scroll; an
internal container does), which matches Telegram Mini App UX conventions.

### `<HScroll>`
Explicit horizontal scroller with `overflow-x-auto` + scroll-snap. Used for category pill
rails and chip groups that exceed viewport width. Items inside must be `shrink-0`.

### `<FieldGroup label hint error>`
One form row — label, input slot (children), optional hint, optional error. Label uses
`[overflow-wrap:anywhere]` so long localised strings don't force the input off-screen. Error
variant shows red hint instead.

### `<Clamp lines={N}>`
CSS line-clamp with a ref-exposed ability to measure overflow and render a "show more" toggle.
Used for AI-generated text (resume summaries, cover letters) where length is unpredictable.

## Route Groups

- **`app/(app)/`** — the Mini App surface. Wrapped by `TelegramProvider` (query + theme +
  auth). All user-facing screens live here.
- **`app/(dev)/`** — bare dev fixtures for Playwright visual regression. **No** Telegram
  provider, **no** NextIntl provider, **no** AuthGate — so screenshots are deterministic.
  Currently hosts `/ui-contract`.

## `/ui-contract` Fixture

[apps/web/app/(dev)/ui-contract/page.tsx](../../apps/web/app/(dev)/ui-contract/page.tsx)

Exercises each primitive under the worst-case content our Phase 6 matrix will throw at it:
- RU-long sentences (30–40% inflation over EN)
- AI-identifier-shape tokens without natural break points
- 12-item HScroll rail (the full category pill count)
- FieldGroup in both hint and error states

Phase 1 visual baseline: 3 viewports × 2 themes × 2 locales = 12 screenshots per D1.5 (the
trimmed matrix). Phase 6 expands to the full 18.

## Theme Bridge

[apps/web/components/telegram/theme-bridge.tsx](../../apps/web/components/telegram/theme-bridge.tsx)

Mounts inside `TelegramProvider`. On mount and on every `themeChanged` / `viewportChanged`
event, copies `Telegram.WebApp.themeParams` keys (`bg_color`, `text_color`, `hint_color`,
`link_color`, `button_color`, `button_text_color`, `secondary_bg_color`) into CSS variables on
`<html>` (`--color-bg`, `--color-text`, `--color-hint`, etc.) and sets `data-theme=light|dark`.
`--tg-viewport-height` + `--tg-viewport-stable-height` follow the same event stream.

Primitives read those CSS variables; automatic light/dark parity with whatever Telegram client
the user is on, no theme-provider boilerplate.

## Biome Rules (Phase 1 activated)

- `noRestrictedImports` on `packages/core/**` blocks framework imports (ADR 0003).
- Test-file override allows `noNonNullAssertion`, `noDelete`, `noExplicitAny` for test fixtures.
- Formatter: 2-space indent, single quotes, trailing commas "all", line width 100.
- `organizeImports` enabled — imports auto-sort on `biome check --fix`.

Layout rules from PLAN.md (T1.44 — `w-\[Npx\]` forbiddance, `fixed|absolute|translate` require
`/* layout-safe: <reason> */` comments) are **documented in CLAUDE.md §7** but not yet
auto-enforced via custom Biome plugins. That's a Phase 6 polish task (D1.10).

## Test Coverage

- Primitive smoke: dev fixture renders without console errors (Playwright spec, Wave H).
- Visual baseline: 12 screenshots (3 viewports × 2 themes × 2 locales) on `/ui-contract` and
  `/` — committed in Wave H.
- Messages parity: `apps/web/messages/messages-parity.test.ts` ensures all 5 locale files
  share the same key tree (no missing `home.greeting` after a Phase 6 translation pass).

## Critical Files

- `apps/web/components/ui/layout/Screen.tsx`
- `apps/web/components/ui/layout/Stack.tsx`
- `apps/web/components/ui/layout/Row.tsx`
- `apps/web/components/ui/layout/Section.tsx`
- `apps/web/components/ui/layout/Scroll.tsx`
- `apps/web/components/ui/layout/HScroll.tsx`
- `apps/web/components/ui/layout/FieldGroup.tsx`
- `apps/web/components/ui/layout/Clamp.tsx`
- `apps/web/components/ui/layout/index.ts` — barrel
- `apps/web/components/telegram/theme-bridge.tsx`
- `apps/web/app/(dev)/layout.tsx`
- `apps/web/app/(dev)/ui-contract/page.tsx`
- `apps/web/app/globals.css` — `@theme` block + CSS var defaults

## Open Follow-ups for Later Phases

- **Phase 2** — profile editor composes `<Screen><Scroll><Stack>` with forms built on
  `<FieldGroup>`; real field validation with Zod + react-hook-form.
- **Phase 3** — 3-screen campaign wizard (per `/Users/vadymmelnychenko/.claude/plans/lucky-noodling-pike.md`) composes Screen/Scroll/Stack/Section
  with category-specific field registries.
- **Phase 6** — full 18-screenshot matrix, real translations, a11y + `prefers-reduced-motion`
  audit, automated Biome `layout-safe` plugin.
