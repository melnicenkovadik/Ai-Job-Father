# ADR 0003 — Clean Architecture with Biome-enforced layer boundaries

**Status:** Accepted (2026-04-16)

## Context

This is a long-lived project implemented primarily by Claude Code in collaboration with one
developer. The project has meaningful business logic (pricing, snapshot canonicalization, state
machines for payments and campaigns) that must be testable without a running framework. We also
want to swap infrastructure (Anthropic → other LLM, Supabase → Postgres + S3, etc.) without
rippling into core logic.

## Decision

Apply Clean Architecture with four layers:

| Layer | Location | Responsibility |
|---|---|---|
| **Domain** | `packages/core/src/domain/*` | Entities, value objects, invariants. Pure TS. |
| **Application** | `packages/core/src/application/*` + `application/ports/*` | Use cases (pure functions taking port dependencies) + port interfaces. |
| **Infrastructure** | `apps/web/lib/*` | Adapters implementing ports (Supabase, Anthropic, Telegram, TON). |
| **Presentation** | `apps/web/app/*` + `apps/web/features/*` | Next.js routing, RSC, client components. Talks to use cases via server actions or API routes. |

The core boundary is enforced by a Biome `noRestrictedImports` rule on `packages/core/**/*.ts`
that forbids `next`, `next/*`, `react`, `react-dom`, `@supabase/*`, `@anthropic-ai/sdk`,
`grammy`, `@tonconnect/*`, `@telegram-apps/*`. Violations fail `pnpm lint` (and CI).

Tests follow a pyramid:
- **Unit** (fast, isolated): `packages/core/src/**/*.test.ts` and `packages/core/test/**/*.test.ts`.
  Use in-memory fake ports.
- **Integration** (adapters against real Supabase local / mocked HTTP via MSW):
  `apps/web/lib/**/*.test.ts`.
- **E2E** (Playwright vs `pnpm dev` with mocked Telegram initData):
  `apps/web/tests/e2e/*.spec.ts`.

## Consequences

**Positive:**
- Business rules are TDD-friendly — no framework to spin up in unit tests.
- Swapping Anthropic for another LLM means one new adapter file in `apps/web/lib/` and the use
  case is unchanged.
- Reviewability: reading `packages/core` shows the entire business logic without framework noise.
- The boundary is a hard lint rule, not a convention — it won't decay.

**Negative:**
- Slight indirection cost (ports + adapters). For MVP-level code this is acceptable; the payoff
  shows up the moment we need to swap a provider or write a unit test.
- Engineers (human or AI) must understand the layer rules before contributing. Mitigated by this
  ADR + `CLAUDE.md` + ARCHITECTURE.md.

## Alternatives Considered

1. **Monolithic Next.js with logic in Server Actions.** Rejected: couples business rules to the
   RSC lifecycle; testing requires booting React / Next.js, which is slow and flaky.

2. **Feature slices without layer separation** (e.g., `features/campaign/*` owns everything from
   UI to DB access). Rejected: makes the "framework-free core" boundary impossible to enforce,
   which is the whole point of Clean Architecture here.

3. **Separate repo for `@ai-job-bot/core`.** Rejected: premature. Single-repo monorepo with
   pnpm workspaces gives us the same boundary benefit without the package-publishing overhead.
