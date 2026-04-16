# Architecture

Single Next.js 15 deployment hosts both the Telegram bot webhook and the Mini App (React
webview). Clean Architecture inside a pnpm + Turborepo monorepo. The bot and the Mini App share
types, auth, and Supabase client via `packages/core` and `apps/web/lib`.

## High-Level Diagram

```
Telegram client (Bot chat + Mini App WebView)
        │
        ▼
┌─────────────────────────────────────────────┐
│  apps/web (Next.js 15, App Router)          │
│  ├─ app/api/bot/webhook  (grammY)           │
│  └─ app/(app)/...        (RSC + client)     │
│          │                                  │
│          ▼                                  │
│  packages/core (framework-free TS)          │
│    domain → application (use cases + ports) │
│          │                                  │
│          ▼                                  │
│  apps/web/lib (infrastructure adapters)     │
│    supabase, anthropic, telegram, payments  │
└─────────────────────────────────────────────┘
        │
        ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ Supabase     │   │ Anthropic    │   │ Payment rails│
│ Postgres +   │   │ Claude 4.5   │   │ TG Stars     │
│ Storage +    │   │ (resume      │   │ TON Connect  │
│ RLS          │   │  parse)      │   │              │
└──────┬───────┘   └──────────────┘   └──────────────┘
       │ read: campaigns WHERE status='paid'
       ▼
  job-hunter worker (separate service, post-MVP)
```

## Layers

| Layer | Lives in | Depends on | Does NOT depend on |
|---|---|---|---|
| **Domain** | `packages/core/src/domain/*` | standard TS only | anything framework |
| **Application** | `packages/core/src/application/*` (use cases) + `ports/*` (interfaces) | domain | frameworks, infrastructure |
| **Infrastructure** | `apps/web/lib/*` (adapters implementing ports) | domain + application + 3rd-party SDKs | presentation |
| **Presentation** | `apps/web/app/*` + `apps/web/features/*` | domain + application | infrastructure (via ports only) |

## Package Map

- `apps/web` — Next.js 15 App Router. Hosts bot webhook (`app/api/bot/webhook`) and Mini App
  (`app/(app)/...`). Contains presentation + infrastructure adapters.
- `packages/core` — framework-free TypeScript. Holds domain entities, value objects, use cases,
  and port interfaces. Biome `noRestrictedImports` forbids framework imports here.
- `packages/db` — Supabase schema (migrations) + generated types. No runtime logic.

## Data Flow Example (resume parse, Phase 2)

```
1. User uploads PDF in Mini App
       ↓
2. apps/web/features/profile/upload-resume.tsx (client)
       ↓ calls
3. apps/web/app/api/profile/parse-resume/route.ts (server)
       ↓ invokes use case
4. packages/core/application/parse-resume.ts
       ↓ calls port
5. packages/core/application/ports/resume-parser.ts  [interface]
       ↓ resolved at runtime to
6. apps/web/lib/anthropic/resume-parser.ts [adapter: Claude Sonnet 4.5 + tool use]
       ↓ returns structured Profile
7. use case persists via profile-repo port → apps/web/lib/supabase/profile-repo.ts
       ↓
8. Row written to Supabase → RLS enforces user isolation
```

## External Dependencies

| Dependency | Used for | Phase wired |
|---|---|---|
| Supabase Postgres + Storage | data + RLS + file storage | 1 |
| Anthropic Claude Sonnet 4.5 | resume parse (tool use) | 2 |
| Telegram Bot API (grammY) | bot webhook, Stars invoices | 1, 4 |
| `@telegram-apps/sdk-react` | Mini App SDK signals | 1 |
| TON API + TonConnect | TON payments | 4 |
| ESCO API | taxonomy autocomplete | 3 |
| Sentry | error tracking | 7 |

## Boundary Enforcement

Root `biome.json` contains a `noRestrictedImports` rule on `packages/core/**/*.ts` that forbids
framework/infrastructure packages. Violations fail `pnpm lint` and CI.

Demonstration (tested during Phase 0):
```bash
# Create a temp file that violates the rule
echo "import 'next'; export const x = 1;" > packages/core/src/bad.ts
pnpm lint
# → Biome reports: Do not import from "next". packages/core is framework-free.
rm packages/core/src/bad.ts
```

## Runtime Model

- All API routes in `app/api/**/route.ts` default to **Node runtime**. grammY requires Node
  (it uses `Buffer`, `crypto`, etc.).
- Pages default to **RSC**. `'use client'` is opt-in, used only where interactivity demands it.
- The Supabase service-role client lives in `server-only` modules (Phase 1+); Biome enforces the
  `server-only` import on files that use `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_JWT_SECRET`.

## How to Add a New Feature (8-step checklist)

1. Add/update domain types in `packages/core/src/domain/<feature>.ts` with Zod schemas.
2. Add use case in `packages/core/src/application/<feature>.ts` — pure function that takes ports.
3. Declare any new port interface in `packages/core/src/application/ports/<name>.ts`.
4. Write unit tests next to the use case or in `packages/core/test/`.
5. Implement adapter(s) in `apps/web/lib/<provider>/<name>.ts`. Biome server-only rule applies.
6. Wire route handler in `apps/web/app/api/<...>/route.ts` — RSC or Node runtime as needed.
7. Build UI in `apps/web/features/<feature>/` — consume use case via server actions or API.
8. Write `docs/features/<feature>.md`; update `CHANGELOG.md`, `PROJECT-MAP.md`, `SESSION-LOG.md`.

## Related

- [ADR 0001 — Next.js as bot host](./DECISIONS/0001-nextjs-as-bot-host.md)
- [ADR 0002 — Supabase as shared DB](./DECISIONS/0002-supabase-as-shared-db.md)
- [ADR 0003 — Clean Architecture with Biome-enforced layer boundaries](./DECISIONS/0003-clean-architecture-layers.md)
