# AI Job Bot

Telegram Mini App for AI-assisted job search across 12 categories. A separate downstream
service reads paid campaigns and executes the actual scraping/applying (out of MVP scope).

## Status

**Phase 0 — Bootstrap & scaffolding** (in progress). See
[docs/CHANGELOG.md](./docs/CHANGELOG.md) for per-phase progress.

## Prerequisites

- Node ≥ 20
- pnpm 10 (`corepack enable && corepack prepare pnpm@10.18.0 --activate`)
- Supabase CLI ≥ 2.90 (`brew install supabase/tap/supabase`)
- gh CLI (optional, for PRs)
- Docker Desktop (needed only when running `supabase start` locally — Phase 1+)

## Quickstart

```bash
# Clone and install
pnpm install

# Copy env template (fill in real values as phases progress)
cp .env.example .env.local

# Start the Next.js app (Phase 0 — no bot, no DB traffic yet)
pnpm dev
# → http://localhost:3000
curl http://localhost:3000/api/health

# Later (Phase 1+), start Supabase locally
pnpm --filter @ai-job-bot/db db:start
pnpm --filter @ai-job-bot/db db:reset
```

## Workspace Layout

```
ai-job-bot/
├── apps/
│   └── web/                    # Next.js 15 App Router (bot webhook + Mini App)
│       ├── app/
│       ├── lib/                # infrastructure adapters (Supabase, Telegram, AI)
│       └── features/           # feature modules (Phase 1+)
├── packages/
│   ├── core/                   # framework-free TypeScript (domain + application)
│   │   ├── src/
│   │   │   ├── domain/
│   │   │   └── application/
│   │   │       └── ports/
│   │   └── test/
│   └── db/                     # Supabase schema + generated types
│       ├── supabase/
│       │   ├── config.toml
│       │   └── migrations/
│       └── types/generated.ts
├── docs/                       # architecture, ADRs, features, changelog, session log
├── .planning/                  # per-phase PLAN.md + verify.md + SUMMARY.md
└── CLAUDE.md                   # project constitution (read first)
```

## Root Scripts

| Script | What it does |
|---|---|
| `pnpm dev` | runs `apps/web` in dev mode |
| `pnpm build` | builds all packages |
| `pnpm typecheck` | runs `tsc --noEmit` across the workspace |
| `pnpm lint` | runs Biome check |
| `pnpm format` | runs Biome formatter with `--write` |
| `pnpm test` | runs all tests |
| `pnpm test:unit` | runs unit tests only |
| `pnpm clean` | removes build output + node_modules |

## Further Reading

- [CLAUDE.md](./CLAUDE.md) — project constitution, non-negotiables.
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — layers, data flow, boundaries.
- [docs/PROJECT-MAP.md](./docs/PROJECT-MAP.md) — current live-system state.
- [docs/CHANGELOG.md](./docs/CHANGELOG.md) — per-phase completion log.
- [.planning/ROADMAP.md](./.planning/ROADMAP.md) — 8-phase plan.
