# Phase 0 — Verification Proof

**Completed:** 2026-04-16 21:32 UTC
**Executor:** Claude (solo, auto-mode)

## Observable Outcome Claim

> `pnpm dev` runs empty Next.js app, `GET /api/health` returns 200, CI configured, Supabase
> scaffolded locally (cloud link deferred).

## Evidence

### 1. Clean `pnpm install`

```
$ pnpm install
Done in 196ms using pnpm v10.18.0
```

Lockfile (`pnpm-lock.yaml`) committed. No `ERR` output. One benign note: "Ignored build scripts:
@biomejs/biome, esbuild, sharp" — build scripts not required for these deps (native binaries
download via separate mechanism).

### 2. Typecheck green

```
$ pnpm -w typecheck
 Tasks:    3 successful, 3 total
Cached:    3 cached, 3 total
  Time:    7ms >>> FULL TURBO
```

All three packages (`@ai-job-bot/core`, `@ai-job-bot/db`, `@ai-job-bot/web`) pass `tsc --noEmit`.

### 3. Lint green

```
$ pnpm -w lint

> ai-job-bot@ lint /Users/vadymmelnychenko/Projects/ai-job-bot
> biome check .

Checked 20 files in 3ms. No fixes applied.
```

Biome 1.9.4 sees all 20 source files (generated types + lockfile + planning data ignored), zero
errors.

### 4. Build green

```
$ SKIP_ENV_VALIDATION=1 pnpm -w build
...
Route (app)                                 Size  First Load JS
┌ ○ /                                      127 B         102 kB
├ ○ /_not-found                            989 B         102 kB
└ ƒ /api/health                            127 B         102 kB
+ First Load JS shared by all             101 kB

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand

 Tasks:    1 successful, 1 total
  Time:    5.455s
```

### 5. Unit tests green

```
$ pnpm -w test:unit
 ✓ test/smoke.test.ts (1 test) 1ms

 Test Files  1 passed (1)
      Tests  1 passed (1)
   Duration  146ms
```

### 6. `pnpm dev` boots + health endpoint returns 200

```
$ pnpm dev &
@ai-job-bot/web:dev:    ▲ Next.js 15.5.15
@ai-job-bot/web:dev:    - Local:        http://localhost:3000
@ai-job-bot/web:dev:  ✓ Ready in 1069ms

$ curl -s -w "\nHTTP: %{http_code}\n" http://localhost:3000/api/health
{"status":"ok","service":"ai-job-bot-web","commit":"local","ts":"2026-04-16T21:32:45.961Z"}
HTTP: 200
```

JSON payload has all four expected fields (`status`, `service`, `commit`, `ts`). Dev server
killed cleanly; port 3000 freed.

### 7. Supabase local dev — deferred per plan

```
$ ls packages/db/supabase/
config.toml          # project_id = "ai-job-bot"
migrations/
  20260417000000_init.sql   # pgcrypto, pg_trgm, uuid-ossp
```

Per execution rule #10: `supabase start` needs Docker and is deferred to Phase 1. The init
migration file exists and is syntactically valid SQL (hand-inspected).

### 8. Biome layer boundary rule enforced

```
$ cat > packages/core/src/bad.ts << 'EOF'
import 'next';
export const x = 1;
EOF

$ ./node_modules/.bin/biome check packages/core/src/bad.ts
packages/core/src/bad.ts:1:8 lint/nursery/noRestrictedImports ━━━━━━━━━━━━━━━━━━━━━━━━━━

  × packages/core is framework-free — move framework code to apps/web/lib

  > 1 │ import 'next';
      │        ^^^^^^

Found 1 error.

$ rm packages/core/src/bad.ts
```

Rule fires correctly; custom message per package appears in output.

### 9. CI workflow configured (pending first push)

`.github/workflows/ci.yml` declares:
- triggers: PR + push to `main`
- steps: checkout → pnpm 10 → Node 20 → install (frozen lockfile) → typecheck → lint → build
  (with `SKIP_ENV_VALIDATION=1`) → unit tests
- timeout: 10 minutes

First CI run pending — GitHub repo creation deferred per user instruction. Workflow will run
automatically on first push when the user creates the remote.

### 10. Git log — atomic commits per task

```
$ git log --oneline | wc -l
36
```

36 commits on `main`, each scoped to one task (conventional commits, no `--no-verify`, no
amends, no force-pushes).

## Per-Phase Ritual Checklist (R-15)

- [x] **R-15.1** Code + tests green — sections 2-5 above.
- [x] **R-15.2** `docs/features/bootstrap.md` created.
- [x] **R-15.3** `docs/CHANGELOG.md` appended with Phase 0 entry.
- [x] **R-15.4** `docs/PROJECT-MAP.md` reflects Phase 0 state (v0).
- [x] **R-15.5** `docs/SESSION-LOG.md` appended with Phase 0 session entry.
- [x] **R-15.6** `CLAUDE.md` (root) created (initial constitution, 19 sections).
- [x] **R-15.7** ADRs 0001 (Next.js as bot host), 0002 (Supabase as shared DB), 0003 (Clean
  Architecture layer boundaries) written.
- [ ] **R-15.8** Auto-memory note — not saved; no cross-session insight worth flagging beyond
  what's captured in CLAUDE.md and the ADRs.
- [x] **R-15.9** This file.
- [x] **R-15.10** Typecheck + build + lint + unit tests all green — sections 2-5.

## Deviations from PLAN.md

1. **`tailwind.config.ts` (T0.15) skipped.** Tailwind v4 configures via the CSS `@theme` block,
   not a JS config file. Creating a legacy `tailwind.config.ts` would be misleading. Documented
   in CHANGELOG under "Deferred".
2. **`noRestrictedImports` rule moved from `style` to `nursery`.** Biome 1.9.4 places the rule
   under `nursery`. The plan's example assumed `style`. Fixed in commit `efeca36`.
3. **`--workdir supabase` removed from `db:*` scripts.** Supabase CLI autodiscovers the
   `supabase/` folder from the current dir; explicit `--workdir` was pointing at the wrong
   place. Fixed in commit `2a60077`.
4. **T0.40 (GitHub repo creation) skipped** per user instruction to keep everything local for
   now.
5. **T0.2 commit (remove `fe/`)** had no git delta — the empty `fe/` directory was never in
   git history (repo was initialized with zero commits). The directory was removed on disk
   during setup; no separate commit was made.

## Acceptance Checklist (from prompt)

- [x] Every task T0.1–T0.41 completed (T0.40 deferred by design)
- [x] `pnpm install` clean
- [x] `pnpm -w typecheck` green
- [x] `pnpm -w lint` green (Biome)
- [x] `pnpm -w build` green
- [x] `pnpm -w test:unit` green (1 smoke test)
- [x] `pnpm dev` starts; `curl http://localhost:3000/api/health` returns 200 JSON
- [x] Layer boundary rule demonstrably works (test performed + cleaned up)
- [x] `git log --oneline` shows clean atomic commits per task
- [x] Ritual artifacts exist: CLAUDE.md, README.md, docs/ARCHITECTURE.md, docs/DECISIONS/0001-3,
      docs/CHANGELOG.md, docs/PROJECT-MAP.md, docs/SESSION-LOG.md, docs/features/bootstrap.md,
      .planning/phases/0/verify.md (this file)

## Next Phase

Phase 1 — Bot + Mini App skeleton + auth. Kicks off with `/gsd:plan-phase 1`:
- BotFather: register bot, obtain token.
- First real Supabase migration: `users` table + RLS.
- Telegram initData HMAC verification (core) + auth middleware (web).
- `next-intl` scaffold for 5 locales (EN filled, rest stubbed).
- Responsive UI Contract primitives (`<Screen>`, `<Stack>`, `<Row>`, `<Section>`, etc.).
- Biome i18n + server-only + paired-test rules activated.
- Playwright visual regression baseline.
