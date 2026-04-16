# 0005 — Responsive UI Contract

**Status:** Accepted 2026-04-17
**Supersedes:** none
**Deciders:** Vadym Melnychenko, Claude

## Context

Telegram Mini Apps render inside WebViews across iOS, Android, and Telegram Desktop. Viewport
geometry shifts when the keyboard opens; safe areas differ per platform; 5 supported locales
inflate strings 30-40% (RU/IT) or collapse them (EN). Without a hard contract, layout bugs
compound phase-over-phase: each new screen re-discovers the same 320px overflow, the same
"content hidden behind MainButton", the same "keyboard pushes form off-screen".

Previous teams have handled this by ad-hoc review. That scales poorly and doesn't survive
cross-session handoffs. This project has Claude as the only developer; consistency must be
enforced by tools, not by memory.

## Decision

We define and enforce a **Responsive UI Contract** from Phase 1 onwards:

1. **Eight layout primitives** in `apps/web/components/ui/layout/` — `<Screen>`, `<Stack>`,
   `<Row>`, `<Section>`, `<Scroll>`, `<HScroll>`, `<FieldGroup>`, `<Clamp>` — with the
   invariants (min-w-0, gap-only spacing, overflow-wrap, safe-area, touch-target size,
   MainButton reserve) baked in. Feature code composes these; feature code never writes raw
   `<div className="flex ...">`.
2. **Theme bridge** (`<ThemeBridge>`) that copies Telegram `themeParams` + viewport events
   into CSS variables (`--color-bg`, `--tg-viewport-height`, ...) on every change. Primitives
   consume those variables; automatic light/dark parity and keyboard shift handling.
3. **Biome guardrails** — `noRestrictedImports` on `packages/core/**`; test-file overrides on
   strict style rules; `w-[Npx]` forbiddance documented in `CLAUDE.md §7` (automated via
   custom Biome plugin deferred to Phase 6 per D1.10).
4. **Playwright visual regression** — a dev-only `/ui-contract` fixture route under
   `app/(dev)/` that exercises all 8 primitives with worst-case content. Phase 1 baselines 3
   viewports × 2 themes × 2 locales = 12 screenshots per D1.5; Phase 6 expands to full matrix.

## Consequences

**Positive.**
- Every new Phase 2+ screen inherits layout safety by composing primitives. Zero new 320px
  overflow bugs expected.
- Visual regressions are caught pre-merge on PRs, not at `verify-work` time or post-deploy.
- Light/dark parity is automatic — no theme provider, no `dark:` class per element.
- Locale stress is built into the fixture, so RU/IT inflation surfaces before translation
  lands in Phase 6.

**Negative.**
- Learning curve. New code must reach for `<Screen>` + `<Stack>` instead of `<div>`.
  Mitigated by: CLAUDE.md §7 spells out the rules; the `/ui-contract` fixture is a live
  reference.
- Visual baselines have to be re-blessed when a primitive genuinely changes (e.g. different
  `Section` title typography). Mitigated by D1.7: first-run baselines are manual
  (`--update-snapshots`); CI enforces compare-only afterwards.
- Font loading on CI can create tiny diffs (serif vs sans fallback). Mitigated by Playwright
  threshold (`--threshold 0.2`, `maxDiffPixelRatio 0.01`) and a single snapshot-blessing PR
  per phase.

## Alternatives Considered

1. **Style audit per PR.** Too expensive; doesn't survive multiple Claude sessions.
2. **Full Storybook + Chromatic.** Heavy toolchain for a solo project; Storybook's value
   peaks at large teams with designers. Our `/ui-contract` fixture is a lighter equivalent.
3. **No contract, fix bugs as they come.** Unacceptable — R-13 in REQUIREMENTS is explicit
   about the viewport and locale matrix, and we'd accumulate regressions between phases.

## Implementation Anchors

- Primitives: `apps/web/components/ui/layout/{Screen,Stack,Row,Section,Scroll,HScroll,FieldGroup,Clamp}.tsx`
- Theme bridge: `apps/web/components/telegram/theme-bridge.tsx`
- Dev fixture: `apps/web/app/(dev)/{layout,ui-contract/page}.tsx`
- Biome config: `biome.json` (test-file + core overrides)
- Visual regression: Playwright config + `/ui-contract` spec (Wave H, next commit)

## Related

- Feature doc: [ui-contract](../features/ui-contract.md)
- Prior ADRs: [0003 — Clean Architecture layers](./0003-clean-architecture-layers.md)
