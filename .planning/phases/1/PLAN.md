---
phase: 1
phase_name: Bot + Mini App skeleton + auth
kind: backend + light UI
observable_outcome: "`/start` in Telegram → Mini App opens → localized greeting renders → `users` row upserted in Supabase. Bot commands (`/start /new /profile /status /help`) registered via BotFather. Responsive UI Contract primitives shipped and visual-regression-tested."
authoritative_refs:
  - ~/.claude/plans/effervescent-wibbling-breeze.md
  - .planning/PROJECT.md
  - .planning/REQUIREMENTS.md   # R-1, R-2, R-3, R-13, R-14, R-15
  - .planning/ROADMAP.md        # Phase 1
  - .planning/phases/0/PLAN.md  # baseline
  - .planning/phases/0/verify.md
commit_style: conventional
total_tasks: 65
requirements: [R-1, R-2, R-3, R-13, R-14, R-15, NFR-2, NFR-5, NFR-6, NFR-8]
---

# Phase 1 — Bot + Mini App skeleton + auth (PLAN)

> **What this plan does:** lights up the end-to-end loop `/start → Mini App → greeting → DB write`.
> Creates the `users` table in Supabase (RLS on), implements HMAC verification of Telegram `initData`,
> mints short-lived Supabase JWTs, wires grammY webhook for the five bot commands, ships the
> **Responsive UI Contract** primitives (`<Screen>`, `<Stack>`, `<Row>`, `<Section>`, `<Scroll>`,
> `<FieldGroup>`, `<Clamp>`, `<HScroll>`) with visual regression baseline, and scaffolds `next-intl`
> for five locales (EN filled, UK/RU/IT/PL stubbed — real translations land in Phase 6).
>
> **What this plan does NOT do:** no resume parse, no profile editor, no campaign wizard, no payments,
> no dashboard. Those are Phase 2+. This plan is the auth + layout + i18n skeleton on top of which all
> later UI lands safely.
>
> **Non-negotiable inputs:** R-1 (bot commands), R-2 (initData HMAC), R-3 (auto-detect locale),
> R-13 (Responsive UI Contract), R-14 (TDD enforcement in `packages/core`), R-15 (per-phase ritual).
> Layer boundaries from ADR 0003 stay enforced (`packages/core` cannot import `next | react |
> @supabase/* | grammy | @telegram-apps/*`).

---

## 0. Prerequisites (verified before planning)

| Item | Required | Observed | Notes |
|---|---|---|---|
| Phase 0 complete | yes | ✅ (see `.planning/phases/0/verify.md`) | 38 atomic commits on `main`, CI green locally |
| Node | ≥20 | v20.20.2 | ✅ |
| pnpm | 10 | 10.18.0 | ✅ |
| Supabase CLI | installed | ✅ | `supabase init` done; `supabase start` deferred until T1.1 |
| Docker Desktop | **running** when T1.1 fires | unknown | **BLOCKER-A** — T1.1 stops & asks user if Docker daemon is down |
| BotFather bot | created | **MISSING** | **BLOCKER-B** — T1.17 pauses for the user to run `/newbot` |
| Public tunnel (ngrok) | installed | unknown | **BLOCKER-C** — T1.24 pauses if no public URL for webhook |

---

## 1. Design Decisions Made In Absence Of Explicit Guidance

Each is reversible but visible. All flagged with `D1.N` (Phase 1 scope).

| # | Decision | Alternative | Rationale |
|---|---|---|---|
| D1.1 | **`jose` for Supabase JWT signing** | `jsonwebtoken` (CommonJS); `@supabase/supabase-js` session helper | `jose` is zero-dep, Edge-runtime compatible, actively maintained, HS256 + `SignJWT().setSubject().setExpirationTime()` is three lines. `jsonwebtoken` has long-documented Edge-runtime incompatibilities and its CJS default-export trips Next 15 treeshaking. The Supabase client's own session-minting path assumes Supabase-Auth-issued JWTs; we mint our own, so we need a primitive, not a wrapper. |
| D1.2 | **Single `NEXT_PUBLIC_MINI_APP_URL` env var drives BOTH the Mini App location (Telegram WebApp url) AND the webhook URL** | Two vars (`MINI_APP_URL` + `WEBHOOK_URL`) | Both must be the same host (one Next.js deployment hosts both — ADR 0001). Two vars invite drift; one var avoids it. `set-webhook.ts` appends `/api/bot/webhook` to this var. |
| D1.3 | **ngrok for dev tunnel (not cloudflared / localtunnel)** | cloudflared (free, no account); localtunnel (zero-setup) | ngrok is the most stable of the three for long-lived HTTPS WebSocket-safe tunnels. Free tier changes subdomain per session — documented as a "kill webhook, re-run set-webhook.ts" pattern in `docs/features/auth-skeleton.md`. cloudflared is a reasonable alternative (added as option B in the feature doc), but ngrok's install/UX is more predictable. **We do not pre-install ngrok** — instructions provided in T1.24; user decides at that gate. |
| D1.4 | **`@telegram-apps/sdk-react` v2 (not manual `window.Telegram.WebApp`)** | Direct global access | Official React bindings + SSR-safe hooks + signal-based reactivity for viewport/theme. Manual access requires guards for `window` undefined on server, custom cleanup of event listeners, hand-rolled viewport math. v2's `<SDKProvider>` subsumes all that. |
| D1.5 | **Playwright viewport matrix trimmed from 18 to 10 for Phase 1** | Full R-13.1 matrix (7 viewports × 2 themes × 5 locales = 70) | Phase 1 has exactly TWO screens (greeting home + UI contract fixture). Full matrix = excessive. Trim to: 3 viewports (320, 390, 1280) × 2 themes (light, dark) × 2 locales (en, ru) = 12 screenshots across both screens. Full matrix activates in Phase 6 during `ui-review`. Trim is documented in ADR 0005. |
| D1.6 | **Single `authenticated` Supabase role (not separate read/write roles)** | Minted JWT role varies per context | RLS policies on `users.id = auth.uid()` give row-level isolation already; a second role adds complexity without a concrete threat. If later a read-only Mini App surface exists, add a second role then. |
| D1.7 | **Visual regression baseline requires manual `--update-snapshots` on first run** | Auto-bless first-ever snapshots | First snapshots ARE the source of truth — they deserve one deliberate click. CI then compares. Second run without `--update-snapshots` fails if anything drifted. Documented in `docs/features/ui-contract.md`. |
| D1.8 | **Supabase JWT expiry = 15 minutes** | 24h (matches initData) | RFC 8725 recommends short-lived access tokens; silent re-auth on 401 via re-sending initData (R-2.6) is cheap (server has already-verified-cached users row). 15 min = the sweet spot between "never expires (bad)" and "re-auths every screen (annoying)". |
| D1.9 | **5 locale files with `[UK] ...` style placeholders for non-EN locales** | Copy EN strings as-is into all files | Placeholders (`[UK] Hello`) make missing translations obvious during dev; identical copies silently succeed. Phase 6 translation pass replaces placeholders. |
| D1.10 | **Biome i18n rule = documented manually-reviewed rule, NOT auto-enforced this phase** | Custom Biome plugin | Biome 1.9 doesn't ship a built-in "no bare strings" rule. Writing a plugin = Phase 6 polish scope. For Phase 1: document the rule in CLAUDE.md (§6 i18n), enforce via PR review + the fact that the greeting screen itself passes via `t()`. Promote to automated lint when next-intl adds a first-party linter or Phase 6 ships the plugin. |
| D1.11 | **First migration lives at `20260418000000_users.sql`** | Today's date exact (`20260416...`) | Phase 0 migration was `20260417000000_init.sql`. Keeping a one-day gap per migration keeps the timeline sensible and avoids collisions if Phase 1 ships across a UTC midnight boundary. |
| D1.12 | **`pnpm db:types` script added** | Manual `supabase gen types ...` every time | One command after every migration = habit, not footgun. Script also copies to `packages/db/types/generated.ts` (the location the Web package imports). |
| D1.13 | **Layer-boundary verification is a pnpm script** | Ad-hoc bash | `pnpm verify:layers` creates `packages/core/src/__bad.ts` with a forbidden import, runs Biome, asserts non-zero exit, deletes the file. This gets re-run in CI from Phase 1 onwards. |
| D1.14 | **Wave H Playwright visual regression is BASELINE-ONLY in CI** (run, generate, commit) | Compare on PR | First run ships the baseline. Second run (on the Phase 2 PR, introducing new screens) compares. CI config reflects this: visual-regression-ci.yml accepts `--update-snapshots` on the Phase 1 merge commit, reverts to compare-only afterwards. Documented in `docs/features/ui-contract.md`. |
| D1.15 | **TanStack Query v5 + TelegramProvider mount at `(app)/layout.tsx`**, NOT root layout | Root layout (wider reach) | `(app)/` route group is the Mini-App-only surface. `/api/*` routes don't need React context; neither does any future marketing site. Root layout stays lean. |
| D1.16 | **Webhook secret token stored in `TELEGRAM_WEBHOOK_SECRET_TOKEN`** | `TELEGRAM_WEBHOOK_SECRET` (Phase 0 var name) | Phase 0 `.env.example` had `TELEGRAM_WEBHOOK_SECRET`. Telegram's own field is `secret_token` so naming matches the Telegram API. Rename Phase 0 var → update `.env.example` + `apps/web/lib/env.ts` in T1.13. |
| D1.17 | **grammY Webhook handler uses `webhookCallback(bot, 'std/http')`** | Long-polling; custom parse | Next.js 15 API routes are std/http compatible; grammY ships a first-party adapter. Simplest correct answer. |
| D1.18 | **Bot command keyboard buttons are inline (Web App type)**, not Reply | Reply keyboard | Reply keyboards take up chat real estate; Web App inline buttons let users open the Mini App without polluting history. |

---

## 2. Task List (65 tasks, grouped by wave A…K — same format as Phase 0)

Format per task:
- **ID** · **Title**
- **Files**: absolute paths created/modified
- **Action**: concrete instructions (include what to avoid + why when non-obvious)
- **Verify**: command / assertion
- **Commit**: conventional commit message template
- **Depends on**: prior task IDs (wave letters for parallelism)

---

### Wave A — Supabase bootstrapping (T1.1 – T1.5)

Independent from Wave B — runs in parallel. But T1.15 (Wave C) needs Wave A done for types.

---

#### T1.1 · Start Docker + `supabase start` (local stack)

- **Files**: none (runtime side effect)
- **Action**:
  1. Check: `docker info >/dev/null 2>&1`. If non-zero: **STOP, prompt user** "Docker Desktop is not running. Please start it, then type `continue`."
  2. Run `cd /Users/vadymmelnychenko/Projects/ai-job-bot/packages/db && supabase start`.
  3. Wait for "API URL: http://127.0.0.1:54321" + "DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres" + "Studio URL: http://127.0.0.1:54323" lines.
  4. Capture `API URL`, `anon key`, `service_role key`, `JWT secret` from stdout.
  5. Append to `.env.local` (create if absent):
     ```
     SUPABASE_URL=http://127.0.0.1:54321
     NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
     SUPABASE_ANON_KEY=<from supabase status>
     NEXT_PUBLIC_SUPABASE_ANON_KEY=<same>
     SUPABASE_SERVICE_ROLE_KEY=<from supabase status>
     SUPABASE_JWT_SECRET=<from supabase status>
     ```
- **Verify**: `curl -fs http://127.0.0.1:54321/rest/v1/ -H "apikey: $SUPABASE_ANON_KEY"` returns 200 (even if empty body). `supabase status` prints "Started".
- **Commit**: (no commit — runtime state; `.env.local` is gitignored)
- **Depends on**: Phase 0 complete

---

#### T1.2 · Migration `20260418000000_users.sql` — `public.users` table + partial-unique on `is_default` is out of scope (that's Phase 2 profiles)

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/packages/db/supabase/migrations/20260418000000_users.sql`
- **Action**: create SQL migration:
  ```sql
  -- ============================================================================
  -- AI Job Bot — Phase 1: users table
  -- Identity row upserted on Telegram initData verification.
  -- Every subsequent table FK-refs users(id); JWT claim sub = users.id.
  -- ============================================================================

  create table public.users (
    id            uuid        primary key default gen_random_uuid(),
    telegram_id   bigint      not null unique,
    username      text,
    first_name    text,
    last_name     text,
    locale        text        not null default 'en',
    is_premium    boolean     not null default false,
    timezone      text,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
  );

  comment on column public.users.telegram_id
    is 'Telegram user id (numeric). Unique; this is the IdP key.';
  comment on column public.users.locale
    is 'ISO 639-1 code. One of: en, uk, ru, it, pl. Auto-detected from initData.user.language_code on first /start.';

  create index users_telegram_id_idx on public.users(telegram_id);

  -- updated_at auto-maintenance
  create or replace function public.set_updated_at()
    returns trigger
    language plpgsql
    as $$
    begin
      new.updated_at = now();
      return new;
    end;
    $$;

  create trigger users_updated_at
    before update on public.users
    for each row
    execute function public.set_updated_at();
  ```
- **Verify**: `pnpm --filter @ai-job-bot/db db:reset` applies the migration without error. `psql` via supabase Studio shows the table.
- **Commit**: `feat(db): add users table (phase 1)`
- **Depends on**: T1.1

---

#### T1.3 · RLS policies on `public.users`

- **Files**: same migration, appended — OR separate migration `20260418000100_users_rls.sql` (preferred — policies shift more often than shape).
- **Action**: create `20260418000100_users_rls.sql`:
  ```sql
  -- RLS: users can read + update their own row. No direct insert from clients.
  -- Inserts happen via service-role during initData verification (auth/session route).

  alter table public.users enable row level security;

  create policy users_self_read
    on public.users
    for select
    using (id = auth.uid());

  create policy users_self_update
    on public.users
    for update
    using (id = auth.uid())
    with check (id = auth.uid());

  -- NO insert policy for clients. service-role bypasses RLS.
  -- NO delete policy: deletion goes through a GDPR RPC in Phase 7.

  comment on policy users_self_read on public.users
    is 'Phase 1 RLS. auth.uid() comes from the Supabase JWT sub claim, minted by /api/auth/session.';
  ```
- **Verify**: after `db:reset`, with a minted JWT for `sub = <users.id>`, an authenticated client can `SELECT` its own row but gets 0 rows for any other id. With anon key + no JWT, 0 rows always.
- **Commit**: `feat(db): enable RLS on users with self-read/update policies`
- **Depends on**: T1.2

---

#### T1.4 · Postgres extension audit (no-op if `pgcrypto` sufficient)

- **Files**: none (Phase 0's init migration already creates `pgcrypto`, `pg_trgm`, `uuid-ossp`)
- **Action**: verify `pgcrypto.gen_random_uuid()` works. If not: `create extension if not exists pgcrypto;`. No `citext` needed in Phase 1 (Telegram `username` is user-controlled case-insensitive but not queried in Phase 1).
- **Verify**: `select gen_random_uuid();` in Studio returns a uuid.
- **Commit**: (no commit — verification only)
- **Depends on**: T1.1

---

#### T1.5 · `pnpm db:types` script + regenerate `packages/db/types/generated.ts`

- **Files**:
  - `/Users/vadymmelnychenko/Projects/ai-job-bot/packages/db/package.json` (modify: `db:types` script already scaffolded in Phase 0, verify it's correct)
  - `/Users/vadymmelnychenko/Projects/ai-job-bot/packages/db/types/generated.ts` (regenerated)
- **Action**:
  1. Verify `db:gen-types` script exists and targets correct path:
     ```json
     "db:gen-types": "supabase gen types typescript --local > types/generated.ts"
     ```
  2. Add a root alias `pnpm db:types` → `pnpm --filter @ai-job-bot/db db:gen-types` in root `package.json` for convenience.
  3. Run `pnpm db:types`.
  4. Git diff `packages/db/types/generated.ts` — expect the placeholder → now populated with `users` table shape (including `Row`, `Insert`, `Update` types and `Database['public']['Tables']['users']`).
- **Verify**: diff shows `users: { Row: { id: string; telegram_id: number; username: string | null; ... } }`. `pnpm --filter @ai-job-bot/db typecheck` passes. `pnpm --filter @ai-job-bot/web typecheck` passes.
- **Commit**: `feat(db): regenerate types after users table migration`
- **Depends on**: T1.3

---

### Wave B — Core domain + application layer (T1.6 – T1.12, TDD)

Runs in parallel with Wave A. `packages/core` has **zero Supabase dependency**; the Supabase adapter is Wave C.

**Every Wave B task is test-first.** Commit order per task: `test(core): add failing test for X` → implement → `feat(core): implement X` OR combined `feat(core): implement X (TDD)` with both files. Vitest runs must show RED before GREEN commits.

---

#### T1.6 · `packages/core/src/domain/user.ts` — entity + value objects + errors (TDD)

- **Files**:
  - `/Users/vadymmelnychenko/Projects/ai-job-bot/packages/core/src/domain/user.ts`
  - `/Users/vadymmelnychenko/Projects/ai-job-bot/packages/core/src/domain/user.test.ts`
- **Action**: RED first. Write tests:
  ```ts
  describe('TelegramId', () => {
    it('accepts positive integers', () => { ... })
    it('rejects zero', () => { ... })
    it('rejects negative', () => { ... })
    it('rejects non-integer', () => { ... })
    it('rejects > Number.MAX_SAFE_INTEGER', () => { ... })
  })
  describe('Locale', () => {
    it('accepts en, uk, ru, it, pl', () => { ... })
    it('rejects unknown codes', () => { ... })
  })
  describe('User', () => {
    it('requires telegramId + locale', () => { ... })
    it('exposes readonly fields', () => { ... })
    it('throws DomainError when constructed with invalid locale', () => { ... })
  })
  ```
  Then GREEN: implement:
  - `type Locale = 'en' | 'uk' | 'ru' | 'it' | 'pl';`
  - `class TelegramId { static from(n: number): TelegramId; readonly value: number }` (branded type ok, class also ok — pick one and stay consistent; class preferred for method attachment)
  - `class User { readonly id: UserId; readonly telegramId: TelegramId; readonly locale: Locale; readonly ... }` — at minimum `id`, `telegramId`, `locale`, `username?`, `firstName?`, `lastName?`, `isPremium`, `timezone?`, `createdAt`, `updatedAt`
  - `DomainError` subclass `InvalidLocaleError`, `InvalidTelegramIdError`
- **Verify**: `pnpm --filter @ai-job-bot/core test` shows all tests passing. `pnpm --filter @ai-job-bot/core typecheck` green.
- **Commit**: `feat(core): add User entity, TelegramId and Locale value objects (TDD)`
- **Depends on**: Phase 0 `packages/core` scaffold

---

#### T1.7 · `packages/core/src/application/ports/user-repo.ts` — interface

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/packages/core/src/application/ports/user-repo.ts`
- **Action**: create port interface:
  ```ts
  import type { TelegramId, User } from '../../domain/user';

  export interface UserRepo {
    findByTelegramId(telegramId: TelegramId): Promise<User | null>;
    upsert(input: UpsertUserInput): Promise<User>;
  }

  export interface UpsertUserInput {
    readonly telegramId: TelegramId;
    readonly username?: string | undefined;
    readonly firstName?: string | undefined;
    readonly lastName?: string | undefined;
    readonly isPremium: boolean;
    readonly languageCode?: string | undefined; // Telegram language_code — not yet narrowed to Locale
    readonly timezone?: string | undefined;
  }
  ```
  No implementation. This is the port; implementations are infrastructure (Wave C).
- **Verify**: `pnpm --filter @ai-job-bot/core typecheck` green.
- **Commit**: `feat(core): add UserRepo port`
- **Depends on**: T1.6

---

#### T1.8 · `packages/core/src/application/ports/clock.ts` — interface

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/packages/core/src/application/ports/clock.ts`
- **Action**:
  ```ts
  export interface Clock {
    now(): Date;
  }

  export const SystemClock: Clock = { now: () => new Date() };
  ```
- **Verify**: typecheck green.
- **Commit**: `feat(core): add Clock port + SystemClock adapter`
- **Depends on**: none

---

#### T1.9 · `packages/core/test/fakes/fake-user-repo.ts` + `packages/core/test/fakes/fixed-clock.ts`

- **Files**:
  - `/Users/vadymmelnychenko/Projects/ai-job-bot/packages/core/test/fakes/fake-user-repo.ts`
  - `/Users/vadymmelnychenko/Projects/ai-job-bot/packages/core/test/fakes/fixed-clock.ts`
  - `/Users/vadymmelnychenko/Projects/ai-job-bot/packages/core/test/fakes/index.ts` (re-exports)
- **Action**:
  - `FakeUserRepo` — in-memory `Map<telegramId, User>`, implements `UserRepo`. Exposes `all()` getter for test assertions. Upsert path creates a new `User` with a deterministic UUID (use a counter for reproducibility, not `crypto.randomUUID()` — seed via constructor).
  - `FixedClock` — `{ now: () => fixedDate }`, with `tick(ms)` mutator for advancing time in tests.
- **Verify**: typecheck green.
- **Commit**: `test(core): add fake UserRepo and fixed Clock for TDD`
- **Depends on**: T1.7, T1.8

---

#### T1.10 · `packages/core/test/builders/user-builder.ts`

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/packages/core/test/builders/user-builder.ts`
- **Action**:
  ```ts
  export const aUser = () => new UserBuilder();

  class UserBuilder {
    private state: /* Partial */ ...;
    withTelegramId(id: number) { ... return this; }
    withLocale(l: Locale) { ... return this; }
    premium() { ... }
    build(): User { ... }
  }
  ```
  Fluent builder — each method returns `this`, `build()` returns a `User` with sensible defaults. Defaults: telegramId=123456789, locale='en', isPremium=false.
- **Verify**: typecheck. Builder usable in other tests: `const u = aUser().withLocale('uk').premium().build();`.
- **Commit**: `test(core): add UserBuilder fluent API`
- **Depends on**: T1.6

---

#### T1.11 · `packages/core/src/application/upsert-user.ts` — use case (TDD)

- **Files**:
  - `/Users/vadymmelnychenko/Projects/ai-job-bot/packages/core/src/application/upsert-user.ts`
  - `/Users/vadymmelnychenko/Projects/ai-job-bot/packages/core/src/application/upsert-user.test.ts`
- **Action**: RED first. Tests cover:
  - **New user path**: `upsertUser({ telegramId: 111, languageCode: 'uk' }, { userRepo: fakeRepo, clock: fixedClock })` → returns User with locale='uk', fakeRepo has the row, createdAt==fixedClock.now().
  - **Returning user path (same telegramId, different languageCode)**: first upsert sets locale='uk'; second upsert with languageCode='ru' → locale stays 'uk' (R-3.1: auto-detect only on first /start), but profile fields (first_name, etc.) update to latest.
  - **Unsupported language_code**: `languageCode: 'fr'` on new user → locale falls back to 'en' (R-3.2).
  - **Missing language_code**: new user with `undefined` → locale='en'.
  - **Premium flag update**: user upgrades premium mid-session → next upsert reflects isPremium=true.
  - **Clock wiring**: upsert stamps `updatedAt = clock.now()`.

  Then GREEN: implement:
  ```ts
  export interface UpsertUserDeps {
    readonly userRepo: UserRepo;
    readonly clock: Clock;
  }

  export interface UpsertUserCommand {
    readonly telegramId: number;
    readonly username?: string | undefined;
    readonly firstName?: string | undefined;
    readonly lastName?: string | undefined;
    readonly isPremium: boolean;
    readonly languageCode?: string | undefined;
  }

  export async function upsertUser(
    cmd: UpsertUserCommand,
    deps: UpsertUserDeps
  ): Promise<User> {
    const telegramId = TelegramId.from(cmd.telegramId);
    const existing = await deps.userRepo.findByTelegramId(telegramId);
    const locale = existing?.locale ?? detectLocale(cmd.languageCode);
    return deps.userRepo.upsert({
      telegramId,
      username: cmd.username,
      firstName: cmd.firstName,
      lastName: cmd.lastName,
      isPremium: cmd.isPremium,
      languageCode: locale,
      // updatedAt stamped inside repo.upsert via clock
    });
  }
  ```
  Critical: this use case does NOT itself touch the clock — the adapter in Wave C does, because `updatedAt` is a DB concern. Remove clock from deps if not needed; but keep if a test for time-dependent logic (e.g. "don't update if row unchanged and last updated < 1s ago") is later added. For Phase 1, simplest: omit clock (YAGNI). Revisit decision during implementation if tests suggest it's needed.
- **Verify**: all 6 tests pass. `pnpm --filter @ai-job-bot/core test` green.
- **Commit**: `feat(core): implement upsertUser use case (TDD)`
- **Depends on**: T1.6, T1.7, T1.9, T1.10, T1.12

---

#### T1.12 · `packages/core/src/domain/locale.ts` — 5-locale enum + `detectLocale` (TDD)

- **Files**:
  - `/Users/vadymmelnychenko/Projects/ai-job-bot/packages/core/src/domain/locale.ts`
  - `/Users/vadymmelnychenko/Projects/ai-job-bot/packages/core/src/domain/locale.test.ts`
- **Action**: RED:
  ```ts
  describe('detectLocale', () => {
    it.each([
      ['en', 'en'],
      ['en-US', 'en'],
      ['uk', 'uk'],
      ['uk-UA', 'uk'],
      ['ru', 'ru'],
      ['ru-RU', 'ru'],
      ['it', 'it'],
      ['it-IT', 'it'],
      ['pl', 'pl'],
      ['pl-PL', 'pl'],
      ['fr', 'en'],     // unsupported falls back
      ['zh-CN', 'en'],
      ['', 'en'],
      [undefined, 'en'],
    ])('maps %s → %s', (input, expected) => { ... })
  })
  ```
  GREEN:
  ```ts
  export const SUPPORTED_LOCALES = ['en', 'uk', 'ru', 'it', 'pl'] as const;
  export type Locale = typeof SUPPORTED_LOCALES[number];

  export function detectLocale(languageCode: string | undefined): Locale {
    if (!languageCode) return 'en';
    const primary = languageCode.split('-')[0]?.toLowerCase();
    return (SUPPORTED_LOCALES as readonly string[]).includes(primary ?? '')
      ? (primary as Locale)
      : 'en';
  }

  export function isLocale(v: unknown): v is Locale {
    return typeof v === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(v);
  }
  ```
  Re-export `Locale` from `domain/user.ts` to keep one source of truth.
- **Verify**: all table tests pass.
- **Commit**: `feat(core): add Locale type + detectLocale function (TDD)`
- **Depends on**: T1.6 (to re-export into user.ts)

---

### Wave C — Telegram + Supabase infrastructure adapters (T1.13 – T1.21)

Depends on Wave A (types) + Wave B (ports, use cases).

---

#### T1.13 · Add web-app dependencies + rename `TELEGRAM_WEBHOOK_SECRET` → `TELEGRAM_WEBHOOK_SECRET_TOKEN`

- **Files**:
  - `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/package.json` (modify: add deps)
  - `/Users/vadymmelnychenko/Projects/ai-job-bot/.env.example` (rename var)
  - `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/lib/env.ts` (rename key, remove `.optional()` where Phase 1 requires it)
- **Action**:
  1. `pnpm --filter @ai-job-bot/web add grammy@^1.30.0 @anthropic-ai/sdk@^0.30.0 @supabase/supabase-js@^2.45.0 @telegram-apps/sdk-react@^2.0.0 next-intl@^3.20.0 @tanstack/react-query@^5.59.0 jose@^5.9.0 zustand@^5.0.0 immer@^10.1.0 server-only@^0.0.1`
  2. `pnpm --filter @ai-job-bot/web add -D @playwright/test@^1.49.0 @testing-library/react@^16.0.0`
  3. In `.env.example`: rename `TELEGRAM_WEBHOOK_SECRET` → `TELEGRAM_WEBHOOK_SECRET_TOKEN`. Add `NEXT_PUBLIC_MINI_APP_URL` (Phase 1 var).
  4. In `lib/env.ts`: rename var; move Phase 1 vars from `.optional()` to required (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET_TOKEN`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_MINI_APP_URL`).
  5. `@anthropic-ai/sdk` added but not used this phase — skeleton only. Comment in `.env.example`: `# phase: 2 — ANTHROPIC_API_KEY used in resume parse`.
- **Verify**: `pnpm --filter @ai-job-bot/web typecheck` passes. With `SKIP_ENV_VALIDATION=1 pnpm --filter @ai-job-bot/web build`, build succeeds. Without the flag, build fails until `.env.local` has the Phase 1 required vars.
- **Commit**: `feat(web): add phase 1 deps (grammy, next-intl, supabase-js, jose, zustand, sdk-react) + rename webhook secret env var`
- **Depends on**: T1.1 (for real env values)

---

#### T1.14 · `apps/web/lib/telegram/verify-init-data.ts` — HMAC-SHA256 verification (TDD)

- **Files**:
  - `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/lib/telegram/verify-init-data.ts`
  - `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/lib/telegram/verify-init-data.test.ts`
- **Action**: Pure function, no network. Testable via Node `crypto`. RED first:
  - Valid signature + fresh timestamp → returns parsed `{ user, authDate, queryId?, ... }`.
  - Tampered payload → throws `InvalidInitDataSignatureError`.
  - Stale `auth_date` (older than `maxAgeSeconds`) → throws `StaleInitDataError`.
  - Missing `hash` field → throws `MalformedInitDataError`.
  - `user=` field JSON-parses into Telegram user object.

  GREEN:
  ```ts
  import { createHmac } from 'node:crypto';

  export interface VerifiedInitData {
    user: TelegramUser; // { id, first_name?, last_name?, username?, language_code?, is_premium? }
    authDate: number;
    queryId?: string;
    startParam?: string;
  }

  export function verifyInitData(
    rawInitData: string,
    botToken: string,
    maxAgeSeconds: number
  ): VerifiedInitData {
    // 1. Parse URLSearchParams
    // 2. Extract hash; remove from pairs
    // 3. Build data-check-string: sort remaining keys alphabetically, join "key=value" with "\n"
    // 4. secretKey = HMAC-SHA256 key="WebAppData", msg=botToken → returns 32-byte key
    // 5. expected = HMAC-SHA256 key=secretKey, msg=dataCheckString → hex
    // 6. If expected !== hash: throw InvalidInitDataSignatureError
    // 7. Parse user JSON
    // 8. Check auth_date staleness against Date.now()/1000 — maxAgeSeconds
    // 9. Return VerifiedInitData
  }
  ```
  Key implementation note: avoid `Buffer.compare` for signature check; use `timingSafeEqual` to prevent timing attacks. For tests: craft valid initData via the same function inverted (test helper in T1.46).
- **Verify**: all test cases pass. Test fixtures include a known-good initData from Telegram docs (or generated via bot-token-free test key).
- **Commit**: `feat(web): implement Telegram initData HMAC verification (TDD)`
- **Depends on**: T1.13

---

#### T1.15 · `apps/web/lib/telegram/session.ts` — resolve `users.id` from verified initData

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/lib/telegram/session.ts`
- **Action**: compose `verifyInitData` + `SupabaseUserRepo` (T1.18) + `upsertUser` use case (T1.11). Returns `{ user, jwt }`.
  ```ts
  import 'server-only';

  export async function resolveSession(
    rawInitData: string
  ): Promise<{ user: User; jwt: string; expiresAt: Date }> {
    const verified = verifyInitData(rawInitData, env.TELEGRAM_BOT_TOKEN, 60 * 60 * 24); // 24h default
    const userRepo = new SupabaseUserRepo(createServiceRoleClient());
    const user = await upsertUser({
      telegramId: verified.user.id,
      username: verified.user.username,
      firstName: verified.user.first_name,
      lastName: verified.user.last_name,
      isPremium: verified.user.is_premium ?? false,
      languageCode: verified.user.language_code,
    }, { userRepo });
    const { jwt, expiresAt } = await signSupabaseJwt(user.id);
    return { user, jwt, expiresAt };
  }
  ```
  Note `server-only` import at top — compile error if this file is imported from client code.
- **Verify**: typecheck. Integration test deferred to T1.50 (E2E).
- **Commit**: `feat(web): add resolveSession glue (verify → upsert → sign JWT)`
- **Depends on**: T1.14, T1.18, T1.21, `upsertUser` use case (T1.11)

---

#### T1.16 · `apps/web/lib/telegram/auth-middleware.ts` — API route wrapper

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/lib/telegram/auth-middleware.ts`
- **Action**:
  ```ts
  import 'server-only';

  export interface AuthedRequest {
    readonly user: User;
    readonly supabase: SupabaseClient<Database>;  // has setSession() called with JWT
  }

  export function requireAuth(
    handler: (req: Request, ctx: AuthedRequest) => Promise<Response>
  ): (req: Request) => Promise<Response> {
    return async (req) => {
      const auth = req.headers.get('authorization');
      const maxAge = req.url.includes('/payments/')
        ? 60 * 60           // 1h for payment endpoints (R-2.3)
        : 60 * 60 * 24;     // 24h default
      if (!auth?.startsWith('Tma ')) return new Response('Unauthorized', { status: 401 });
      const raw = auth.slice(4);
      try {
        const { user, jwt } = await resolveSession(raw); // reuses caching internally
        // Reuse within request: only re-verify + re-upsert when needed
        const supabase = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
        await supabase.auth.setSession({ access_token: jwt, refresh_token: '' });
        return handler(req, { user, supabase });
      } catch (err) {
        if (err instanceof StaleInitDataError) return new Response('Stale', { status: 401, headers: { 'x-reason': 'stale' }});
        if (err instanceof InvalidInitDataSignatureError) return new Response('Forbidden', { status: 403 });
        throw err;
      }
    };
  }
  ```
  Note: `maxAge` branch uses a path heuristic since `/payments/*` doesn't exist yet — documented stub. Wave D might tighten this.
- **Verify**: typecheck. Integration coverage deferred to Phase 4 payment tests + T1.51.
- **Commit**: `feat(web): add requireAuth middleware with 24h/1h initData freshness`
- **Depends on**: T1.15

---

#### T1.17 · `apps/web/lib/telegram/bot.ts` — grammY `Bot` singleton + command handlers  **[CHECKPOINT: bot token needed here]**

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/lib/telegram/bot.ts`
- **Action**: **BLOCKER-B engages here.** Before implementing, STOP and prompt:
  > "To proceed, open @BotFather on Telegram and:
  > 1. Send `/newbot`; pick a name (e.g. "AI Job Bot") + username ending in `bot` (e.g. `ai_job_bot_vad_bot`).
  > 2. BotFather returns a token like `1234567890:AAA...XXX`. Put it in `.env.local` as `TELEGRAM_BOT_TOKEN=...`.
  > 3. Also set a 32-byte random hex as webhook secret: `TELEGRAM_WEBHOOK_SECRET_TOKEN=$(openssl rand -hex 32)` (or a similar CLI).
  > 4. Also set `NEXT_PUBLIC_MINI_APP_URL` — either an ngrok HTTPS URL (run `ngrok http 3000` in another terminal) or a deployed Vercel preview. For dev, ngrok is easiest.
  > 5. Back in BotFather: `/setmenubutton` → pick your bot → paste the URL + label "Open Mini App".
  >    (Alternatively: `/newapp` → pick your bot → fill in title/short-desc/photo → URL.)
  > Then type `continue`."

  After user confirms, implement:
  ```ts
  import 'server-only';
  import { Bot, InlineKeyboard } from 'grammy';

  const miniAppUrl = env.NEXT_PUBLIC_MINI_APP_URL;

  export const bot = new Bot(env.TELEGRAM_BOT_TOKEN);

  const openAppButton = (route = '/') =>
    new InlineKeyboard().webApp('Open App', `${miniAppUrl}${route}`);

  bot.command('start', async (ctx) => {
    await ctx.reply("Welcome! Tap to open the app.", { reply_markup: openAppButton('/') });
    // Note: user upsert happens when the Mini App actually loads (via /api/auth/session)
    // We don't upsert in /start because raw Telegram webhook doesn't include initData
  });

  bot.command('new', async (ctx) => {
    await ctx.reply("Let's create a campaign.", { reply_markup: openAppButton('/campaign/new/wizard') });
  });

  bot.command('profile', async (ctx) => {
    await ctx.reply("Manage your profile.", { reply_markup: openAppButton('/profile') });
  });

  bot.command('status', async (ctx) => {
    // Phase 1: static placeholder. Real campaigns list lands Phase 5.
    await ctx.reply("No campaigns yet. Tap to get started.", { reply_markup: openAppButton('/') });
  });

  bot.command('help', async (ctx) => {
    await ctx.reply(
      "Commands:\n/start — open app\n/new — new campaign\n/profile — manage profile\n/status — campaigns summary\n/help — this message",
      { reply_markup: openAppButton('/') }
    );
  });

  // Also: register commands in Telegram's client UI
  export async function syncBotCommands() {
    await bot.api.setMyCommands([
      { command: 'start', description: 'Open the app' },
      { command: 'new', description: 'Create a new campaign' },
      { command: 'profile', description: 'Manage your profile' },
      { command: 'status', description: 'Last campaigns summary' },
      { command: 'help', description: 'Help' },
    ]);
  }
  ```
- **Verify**: typecheck. With bot token set and webhook unregistered, `pnpm tsx -e "import('./apps/web/lib/telegram/bot').then(m => m.bot.api.getMe().then(console.log))"` prints bot info. Do NOT deploy webhook yet.
- **Commit**: `feat(web): add grammY bot singleton + command handlers + setMyCommands`
- **Depends on**: T1.13, user action (BLOCKER-B)

---

#### T1.18 · `apps/web/lib/supabase/server.ts` — service-role client, `server-only`

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/lib/supabase/server.ts`
- **Action**:
  ```ts
  import 'server-only';
  import { createClient, type SupabaseClient } from '@supabase/supabase-js';
  import type { Database } from '@ai-job-bot/db';
  import { env } from '../env';

  let cached: SupabaseClient<Database> | null = null;

  export function createServiceRoleClient(): SupabaseClient<Database> {
    if (cached) return cached;
    cached = createClient<Database>(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return cached;
  }
  ```
  Also: add a `SupabaseUserRepo` class implementing `UserRepo` port — calls `supabase.from('users').upsert({...}, { onConflict: 'telegram_id' }).select().single()`. Place it at `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/lib/supabase/user-repo.ts` (or same file — prefer separate for clarity).
- **Verify**: typecheck. Integration test: spin Supabase local, call `new SupabaseUserRepo(...).upsert(...)`, confirm row appears.
- **Commit**: `feat(web): add supabase service-role client + SupabaseUserRepo adapter`
- **Depends on**: T1.5, T1.7, T1.13

---

#### T1.19 · `apps/web/lib/supabase/browser.ts` — anon client + JWT session flow

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/lib/supabase/browser.ts`
- **Action**:
  ```ts
  'use client';

  import { createBrowserClient } from '@supabase/ssr';
  import type { Database } from '@ai-job-bot/db';
  import { env } from '../env';

  let cached: SupabaseClient<Database> | null = null;

  export function getBrowserClient(): SupabaseClient<Database> {
    if (typeof window === 'undefined') throw new Error('getBrowserClient called on server');
    if (!cached) {
      cached = createBrowserClient<Database>(
        env.NEXT_PUBLIC_SUPABASE_URL!,
        env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
    }
    return cached;
  }

  // Apply the JWT returned by /api/auth/session.
  export async function applySupabaseJwt(jwt: string): Promise<void> {
    const c = getBrowserClient();
    await c.auth.setSession({ access_token: jwt, refresh_token: '' });
  }
  ```
  Note: we don't have a refresh token — on 401, re-auth by re-POSTing initData. Documented in `docs/features/auth-skeleton.md`.
- **Verify**: typecheck. Works in a minimal React component that's never imported on server.
- **Commit**: `feat(web): add supabase browser client + applySupabaseJwt helper`
- **Depends on**: T1.13

---

#### T1.20 · `apps/web/lib/supabase/types.ts` — re-export `Database`

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/lib/supabase/types.ts`
- **Action**:
  ```ts
  export type { Database } from '@ai-job-bot/db';
  // Convenience aliases for frequently used rows
  import type { Database } from '@ai-job-bot/db';
  export type UserRow = Database['public']['Tables']['users']['Row'];
  export type UserInsert = Database['public']['Tables']['users']['Insert'];
  ```
- **Verify**: typecheck. Consumers (e.g. Supabase user repo) can import `UserRow` without drilling through `Database['public']['Tables']...`.
- **Commit**: `feat(web): re-export Database + row aliases from supabase types`
- **Depends on**: T1.5

---

#### T1.21 · `apps/web/lib/auth/jwt.ts` — sign Supabase JWT with `jose`

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/lib/auth/jwt.ts`
- **Action**:
  ```ts
  import 'server-only';
  import { SignJWT } from 'jose';
  import { env } from '../env';

  export async function signSupabaseJwt(
    userId: string,
    expiresInSeconds = 15 * 60
  ): Promise<{ jwt: string; expiresAt: Date }> {
    const secret = new TextEncoder().encode(env.SUPABASE_JWT_SECRET!);
    const issuedAt = Math.floor(Date.now() / 1000);
    const exp = issuedAt + expiresInSeconds;
    const jwt = await new SignJWT({ role: 'authenticated' })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(userId)
      .setIssuedAt(issuedAt)
      .setExpirationTime(exp)
      .setIssuer('supabase')
      .sign(secret);
    return { jwt, expiresAt: new Date(exp * 1000) };
  }
  ```
- **Verify**: unit test: sign a JWT, decode via `jose.jwtVerify`, assert `payload.sub === userId`, `payload.role === 'authenticated'`, exp ~now+900s. Also: paste the JWT into jwt.io, confirm "Invalid Signature" when using wrong secret.
- **Commit**: `feat(web): add signSupabaseJwt helper using jose (15-min expiry)`
- **Depends on**: T1.13

---

### Wave D — API routes (T1.22 – T1.24)

Depends on Wave C.

---

#### T1.22 · `apps/web/app/api/bot/webhook/route.ts` — grammY webhook handler

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/app/api/bot/webhook/route.ts`
- **Action**:
  ```ts
  export const runtime = 'nodejs';
  export const dynamic = 'force-dynamic';

  import { webhookCallback } from 'grammy';
  import { bot } from '@/lib/telegram/bot';
  import { env } from '@/lib/env';

  const handler = webhookCallback(bot, 'std/http', {
    secretToken: env.TELEGRAM_WEBHOOK_SECRET_TOKEN,
  });

  export async function POST(req: Request): Promise<Response> {
    return handler(req);
  }
  ```
  grammY's `webhookCallback` with `secretToken` verifies `X-Telegram-Bot-Api-Secret-Token` header itself (R-1.7). If header missing or wrong → 401 automatically.
- **Verify**: typecheck. Integration test at T1.65.
- **Commit**: `feat(web): add /api/bot/webhook route with grammy + secret token check`
- **Depends on**: T1.17

---

#### T1.23 · `apps/web/app/api/auth/session/route.ts` — mint Supabase JWT

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/app/api/auth/session/route.ts`
- **Action**:
  ```ts
  export const runtime = 'nodejs';
  export const dynamic = 'force-dynamic';

  import { resolveSession } from '@/lib/telegram/session';
  import { StaleInitDataError, InvalidInitDataSignatureError } from '@/lib/telegram/verify-init-data';

  export async function POST(req: Request): Promise<Response> {
    const auth = req.headers.get('authorization');
    if (!auth?.startsWith('Tma ')) return Response.json({ error: 'missing_init_data' }, { status: 401 });
    const raw = auth.slice(4);
    try {
      const { user, jwt, expiresAt } = await resolveSession(raw);
      return Response.json({
        jwt,
        expiresAt: expiresAt.toISOString(),
        user: { id: user.id, telegramId: user.telegramId.value, locale: user.locale, firstName: user.firstName, lastName: user.lastName, username: user.username },
      });
    } catch (err) {
      if (err instanceof StaleInitDataError) return Response.json({ error: 'stale_init_data' }, { status: 401 });
      if (err instanceof InvalidInitDataSignatureError) return Response.json({ error: 'invalid_signature' }, { status: 403 });
      throw err;
    }
  }
  ```
- **Verify**: typecheck. Functional test at T1.50.
- **Commit**: `feat(web): add /api/auth/session route (initData → Supabase JWT)`
- **Depends on**: T1.15

---

#### T1.24 · `scripts/set-webhook.ts` — CLI to register webhook URL  **[CHECKPOINT: ngrok URL needed]**

- **Files**:
  - `/Users/vadymmelnychenko/Projects/ai-job-bot/scripts/set-webhook.ts`
  - `/Users/vadymmelnychenko/Projects/ai-job-bot/scripts/package.json` (create if absent — `"type": "module"`, depends on `tsx`)
  - Root `package.json` — add `"set-webhook": "tsx scripts/set-webhook.ts"`
- **Action**:
  ```ts
  // scripts/set-webhook.ts
  import { Bot } from 'grammy';

  const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN;
  const BASE = process.env.NEXT_PUBLIC_MINI_APP_URL;

  if (!TOKEN || !SECRET || !BASE) {
    console.error('Missing env: TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET_TOKEN, NEXT_PUBLIC_MINI_APP_URL');
    process.exit(1);
  }

  const url = `${BASE.replace(/\/$/, '')}/api/bot/webhook`;

  const bot = new Bot(TOKEN);
  const before = await bot.api.getWebhookInfo();
  console.log('Before:', before);

  await bot.api.setWebhook(url, {
    secret_token: SECRET,
    allowed_updates: ['message', 'callback_query', 'pre_checkout_query', 'successful_payment'],
    drop_pending_updates: true,
  });

  const after = await bot.api.getWebhookInfo();
  console.log('After:', after);
  ```
  **BLOCKER-C**: before running, user must provide a public HTTPS URL. In dev: `ngrok http 3000` returns `https://<random>.ngrok.app`. Prompt at execution time:
  > "You need a public HTTPS URL for the webhook. Options:
  > 1. (Recommended for dev) Open a new terminal, install ngrok (`brew install ngrok` or similar), run `ngrok http 3000`. Copy the HTTPS URL it prints.
  > 2. (Alternative) Deploy a Vercel preview — requires Vercel account + Supabase cloud project.
  > Paste the URL back here, I'll set `NEXT_PUBLIC_MINI_APP_URL` and run the webhook registration."

  NOTE: Free ngrok changes the URL each session — document in `docs/features/auth-skeleton.md` that user re-runs `pnpm set-webhook` after each ngrok restart.
- **Verify**: script exits 0, "After:" prints the url with `has_custom_certificate: false, pending_update_count: 0, url: "<your URL>/api/bot/webhook"`. `curl -X POST https://api.telegram.org/bot$TOKEN/getWebhookInfo` confirms externally.
- **Commit**: `feat(scripts): add set-webhook script to register Telegram webhook`
- **Depends on**: T1.17, T1.22, user action (BLOCKER-C)

---

### Wave E — i18n skeleton (T1.25 – T1.29)

Runs in parallel with Wave F (UI primitives) but F's task T1.38 references the messages files, so finish E first for fixture rendering.

---

#### T1.25 · Five messages files — `en.json` real, others placeholder

- **Files**:
  - `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/messages/en.json`
  - `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/messages/uk.json`
  - `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/messages/ru.json`
  - `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/messages/it.json`
  - `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/messages/pl.json`
- **Action**: identical key structure across all 5 files. EN has real strings; others have `[UK]`, `[RU]`, `[IT]`, `[PL]` prefix on each value (D1.9).
  Minimal key set for Phase 1:
  ```json
  {
    "home": {
      "greeting": {
        "en": "Hi, {name}!",
        "uk": "[UK] Hi, {name}!",
        ...
      },
      "description": "AI Job Bot helps you find the right role — across tech, design, marketing, and more.",
      "cta": {
        "create_campaign": "Create a campaign"
      }
    },
    "common": {
      "loading": "Loading...",
      "error": "Something went wrong",
      "retry": "Retry"
    }
  }
  ```
  Use **ICU message format** via next-intl (supports `{name}`).
- **Verify**: all 5 files valid JSON, same key set. Write a quick test `packages/core/test/messages-parity.test.ts` that reads all 5, asserts identical key sets recursively.
- **Commit**: `feat(web): add 5 locale message files (en real, uk/ru/it/pl placeholders)`
- **Depends on**: T1.13

---

#### T1.26 · `apps/web/app/i18n/request.ts` — next-intl config

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/app/i18n/request.ts`
- **Action**:
  ```ts
  import { getRequestConfig } from 'next-intl/server';
  import { cookies, headers } from 'next/headers';
  import { SUPPORTED_LOCALES, detectLocale, type Locale } from '@ai-job-bot/core/domain/locale';

  export default getRequestConfig(async () => {
    const cookieStore = await cookies();
    const hdrs = await headers();

    // Priority:
    // 1. explicit cookie (Phase 5 settings)
    // 2. user.locale from DB (Phase 1 auth middleware sets this in a cookie)
    // 3. Accept-Language header
    // 4. fallback 'en'
    const cookieLocale = cookieStore.get('locale')?.value;
    const headerLocale = hdrs.get('accept-language')?.split(',')[0];
    const resolved: Locale = (cookieLocale && (SUPPORTED_LOCALES as readonly string[]).includes(cookieLocale))
      ? cookieLocale as Locale
      : detectLocale(headerLocale);

    const messages = (await import(`../../messages/${resolved}.json`)).default;
    return { locale: resolved, messages };
  });
  ```
- **Verify**: typecheck. In a test route or page that calls `getTranslations()`, it returns the correct locale strings.
- **Commit**: `feat(web): add next-intl request config with DB-cookie-header locale priority`
- **Depends on**: T1.12 (for `detectLocale`), T1.25

---

#### T1.27 · `apps/web/middleware.ts` — locale-passthrough middleware

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/middleware.ts`
- **Action**:
  ```ts
  import { NextRequest, NextResponse } from 'next/server';

  export function middleware(req: NextRequest): NextResponse {
    const res = NextResponse.next();
    // Pass-through — actual locale resolution is in app/i18n/request.ts
    // This middleware exists so future locale-specific routing (Phase 5 settings) can hook in.
    return res;
  }

  export const config = {
    matcher: ['/((?!api|_next|favicon.ico).*)'],
  };
  ```
  No locale prefix in URL — Telegram Mini App is single-origin, language picked by user preference (Phase 5) not URL.
- **Verify**: middleware runs on page routes, skipped on `/api/*`, no redirect loops.
- **Commit**: `feat(web): add minimal locale-passthrough middleware`
- **Depends on**: T1.13

---

#### T1.28 · `apps/web/components/i18n/LocaleSwitcher.tsx` — dev-only placeholder

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/components/i18n/LocaleSwitcher.tsx`
- **Action**:
  ```tsx
  'use client';
  import { SUPPORTED_LOCALES } from '@ai-job-bot/core/domain/locale';

  export function LocaleSwitcher() {
    if (process.env.NODE_ENV !== 'development') return null;
    const onChange = (l: string) => {
      document.cookie = `locale=${l}; path=/; max-age=${60*60*24*30}`;
      location.reload();
    };
    return (
      <select onChange={(e) => onChange(e.target.value)} defaultValue="">
        <option value="" disabled>Locale</option>
        {SUPPORTED_LOCALES.map(l => <option key={l} value={l}>{l}</option>)}
      </select>
    );
  }
  ```
  Dev-only per D1.9 — real picker in Phase 5 Settings. This exists so we can flip locale during Phase 1 dev and inspect the 5 variants.
- **Verify**: mounted only in dev builds; switching reloads with new locale.
- **Commit**: `feat(web): add dev-only LocaleSwitcher`
- **Depends on**: T1.12

---

#### T1.29 · Biome: document i18n rule in CLAUDE.md §6 (manual review, per D1.10)

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/CLAUDE.md` (modify §6)
- **Action**: expand §6 of CLAUDE.md:
  ```
  ## 6. i18n rule (Phase 1+)
  No bare user-facing strings anywhere under `apps/web/features/**` or `apps/web/components/**`
  except `components/ui/layout/**` (pure-structural primitives — no copy). All text flows through
  `useTranslations()` or `getTranslations()` from `next-intl`.

  **Exception:** `aria-label`, `alt`, and other accessibility attributes on UI primitives MAY contain
  English fallbacks provided they're also keyed in messages; the prop accepts both (translated first,
  English fallback second).

  **Enforcement:** Phase 1 = manual PR review + visual inspection via LocaleSwitcher. Phase 6 will
  land an automated linter (Biome plugin or codemod) that flags string literals in JSX outside the
  whitelisted paths.

  **Why manual for now:** Biome 1.9 has no first-party rule for this. Writing a plugin is ~1 day
  of work — not justified while Phase 1 has 2 screens and 100% `t()` coverage visible at a glance.
  ```
  Also add to `docs/features/i18n-skeleton.md` (T1.54).
- **Verify**: CLAUDE.md reads coherently; reviewer can use §6 as the acceptance bar.
- **Commit**: `docs: expand CLAUDE.md §6 with i18n enforcement policy (Phase 1 manual, Phase 6 auto)`
- **Depends on**: none

---

### Wave F — Responsive UI Contract primitives (T1.30 – T1.38)

**Critical**. Shipped in Phase 1 so every subsequent phase builds on a stable layout base. Can run in parallel with Wave E; T1.38 depends on both.

---

#### T1.30 · `components/ui/layout/Screen.tsx`

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/components/ui/layout/Screen.tsx`
- **Action**:
  ```tsx
  import * as React from 'react';
  import { cn } from '@/lib/cn';

  export interface ScreenProps extends React.HTMLAttributes<HTMLDivElement> {
    reserveMainButton?: boolean; // adds bottom padding 96px
  }

  export const Screen = React.forwardRef<HTMLDivElement, ScreenProps>(
    ({ className, reserveMainButton = true, children, ...rest }, ref) => (
      <div
        ref={ref}
        className={cn(
          'flex min-h-[var(--tg-viewport-height,100vh)] w-full flex-col',
          'bg-[var(--color-bg)] text-[var(--color-text)]',
          'overflow-x-hidden',
          reserveMainButton && 'pb-[var(--mainbtn-h,96px)]',
          className
        )}
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
        }}
        {...rest}
      >
        {children}
      </div>
    )
  );
  Screen.displayName = 'Screen';
  ```
  Also add `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/lib/cn.ts` if absent (`clsx + tailwind-merge`, or just `clsx`). If clsx isn't a dep, add `clsx@^2.1.0`.
- **Verify**: typecheck. No `100vh` string (uses `var(--tg-viewport-height, 100vh)` fallback). Rendered in a test harness with `window.innerHeight` override — height tracks the CSS var.
- **Commit**: `feat(ui): add <Screen> layout primitive (viewport var, safe-area, mainbutton reserve)`
- **Depends on**: T1.13

---

#### T1.31 · `components/ui/layout/Stack.tsx`

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/components/ui/layout/Stack.tsx`
- **Action**:
  ```tsx
  export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
    gap?: 0 | 1 | 2 | 3 | 4 | 6 | 8;
  }

  export const Stack = React.forwardRef<HTMLDivElement, StackProps>(
    ({ className, gap = 3, ...rest }, ref) => (
      <div
        ref={ref}
        className={cn('flex flex-col min-w-0', gapClass(gap), className)}
        {...rest}
      />
    )
  );

  function gapClass(g: number) { return { 0:'gap-0', 1:'gap-1', 2:'gap-2', 3:'gap-3', 4:'gap-4', 6:'gap-6', 8:'gap-8' }[g]; }
  ```
  Key: `min-w-0` ensures children can shrink below their content width (the default flex child behavior breaks truncation).
- **Verify**: typecheck. Nested `<Stack gap={2}><p>long text...</p></Stack>` inside a narrow parent — text truncates/wraps, doesn't force horizontal scroll.
- **Commit**: `feat(ui): add <Stack> layout primitive (min-w-0, gap-only spacing)`
- **Depends on**: T1.30 (shares `cn.ts`)

---

#### T1.32 · `components/ui/layout/Row.tsx`

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/components/ui/layout/Row.tsx`
- **Action**: mirror `Stack` but `flex-row`. Props: `gap` (same enum), `align?: 'start'|'center'|'end'` (default 'center'), `justify?`.
- **Verify**: typecheck; same flex-safety test as Stack.
- **Commit**: `feat(ui): add <Row> layout primitive`
- **Depends on**: T1.31

---

#### T1.33 · `components/ui/layout/Section.tsx`

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/components/ui/layout/Section.tsx`
- **Action**:
  ```tsx
  export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
    title?: string;
    description?: string;
  }
  // <section>
  //   <header>{title}, {description}</header>
  //   <Stack gap={3}>{children}</Stack>
  // </section>
  // With px-4, py-6, and overflow guards.
  ```
- **Verify**: typecheck; rendered with long title — truncates or wraps, no overflow.
- **Commit**: `feat(ui): add <Section> titled-block primitive`
- **Depends on**: T1.31

---

#### T1.34 · `components/ui/layout/Scroll.tsx`

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/components/ui/layout/Scroll.tsx`
- **Action**: the ONLY place `overflow-y: auto` legally appears in this codebase.
  ```tsx
  export const Scroll = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...rest }, ref) => (
      <div
        ref={ref}
        className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain', className)}
        {...rest}
      />
    )
  );
  ```
  `min-h-0 flex-1` — the Stack/flex recipe that lets a child actually scroll while its parent is constrained.
  Add a comment in the file: "Any new `overflow-y: auto` in this repo must go through <Scroll>. PRs introducing it elsewhere must be rejected in review. Enforced manually until Phase 6 lint plugin."
- **Verify**: typecheck; nested inside `<Screen><Stack>` with tall content — only this element scrolls, body does not.
- **Commit**: `feat(ui): add <Scroll> primitive (sole owner of overflow-y)`
- **Depends on**: T1.31

---

#### T1.35 · `components/ui/layout/FieldGroup.tsx`

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/components/ui/layout/FieldGroup.tsx`
- **Action**:
  ```tsx
  export interface FieldGroupProps {
    label: React.ReactNode;
    hint?: React.ReactNode;
    error?: React.ReactNode;
    children: React.ReactNode; // the input
    id?: string;
  }
  // <label> + input wrapper + hint/error
  // min-w-0 on the wrapper so long labels in RU/IT truncate
  ```
- **Verify**: typecheck; renders at 320px with a 60-char label — label wraps, input fits.
- **Commit**: `feat(ui): add <FieldGroup> form-row primitive`
- **Depends on**: T1.31

---

#### T1.36 · `components/ui/layout/Clamp.tsx`

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/components/ui/layout/Clamp.tsx`
- **Action**:
  ```tsx
  export interface ClampProps extends React.HTMLAttributes<HTMLDivElement> {
    lines: 1 | 2 | 3 | 4 | 5;
    expandable?: boolean;
    children: React.ReactNode;
  }
  ```
  Uses `line-clamp-{N}` Tailwind util + "Show more" button when `expandable` + clamping.
  Binary state (clamped|expanded) via `useState`, no animation in Phase 1 (Motion lands Phase 2).
- **Verify**: typecheck; 1000-char string in `<Clamp lines={3}>` — truncates with ellipsis, "Show more" expands.
- **Commit**: `feat(ui): add <Clamp> primitive with optional show-more`
- **Depends on**: T1.30

---

#### T1.37 · `components/ui/layout/HScroll.tsx`

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/components/ui/layout/HScroll.tsx`
- **Action**:
  ```tsx
  export const HScroll = ({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
    <div
      className={cn('flex w-full min-w-0 gap-3 overflow-x-auto overscroll-x-contain', className)}
      style={{ scrollbarWidth: 'none' }}
      {...rest}
    />
  );
  ```
  Explicit — any horizontal scrolling in features MUST wrap in `<HScroll>`. Pairs with Biome rule blocking bare `overflow-x` elsewhere (Wave G activates this).
- **Verify**: 5 wide cards inside `<HScroll>` — horizontally scrolls, body doesn't.
- **Commit**: `feat(ui): add <HScroll> primitive for explicit horizontal scrollers`
- **Depends on**: T1.30

---

#### T1.38 · Visual regression fixture route — `/dev/ui-contract`

- **Files**:
  - `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/app/(dev)/ui-contract/page.tsx`
  - `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/app/(dev)/layout.tsx` (minimal — no Mini App chrome, just the fixtures)
- **Action**: RSC page that renders each primitive with three fixtures side by side:
  - `en-short`: minimal strings
  - `ru-long`: cyrillic, long labels (e.g. 80-char Section title, 200-char Clamp body)
  - `x-loud`: pseudo-locale (`[!!! Hello, Vadym !!!]` style — drop-in synth)

  Each primitive rendered 3× in a grid, each at 320px, 390px, 1280px emulated via CSS `inline-size`.
  Top of page: small banner "Dev fixture — not user-facing. Visible only on localhost:3000 or Vercel preview."
  Add a gate: `if (process.env.NEXT_PUBLIC_APP_ENV === 'production') return notFound();`
- **Verify**: `pnpm dev` + visit `http://localhost:3000/dev/ui-contract` — all primitives render all 9 permutations (3 locales × 3 widths). No overflow, no clipping.
- **Commit**: `feat(ui): add /dev/ui-contract fixture route for visual regression`
- **Depends on**: T1.30–T1.37, T1.25

---

### Wave G — Telegram Mini App WebView integration (T1.39 – T1.44)

Depends on Waves E, F (route group layout uses primitives + translations).

---

#### T1.39 · `components/telegram/TelegramProvider.tsx`

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/components/telegram/TelegramProvider.tsx`
- **Action**:
  ```tsx
  'use client';
  import * as React from 'react';
  import { SDKProvider, useLaunchParams, useViewport, useThemeParams } from '@telegram-apps/sdk-react';

  export function TelegramProvider({ children }: { children: React.ReactNode }) {
    return (
      <SDKProvider acceptCustomStyles debug={process.env.NODE_ENV === 'development'}>
        <ViewportBinder />
        <ThemeBinder />
        {children}
      </SDKProvider>
    );
  }

  function ViewportBinder() {
    const vp = useViewport();
    React.useEffect(() => {
      if (!vp) return;
      const root = document.documentElement;
      const apply = () => {
        root.style.setProperty('--tg-viewport-height', `${vp.height}px`);
        root.style.setProperty('--tg-viewport-stable-height', `${vp.stableHeight}px`);
      };
      apply();
      return vp.on('change', apply);
    }, [vp]);
    return null;
  }

  function ThemeBinder() {
    const theme = useThemeParams();
    React.useEffect(() => {
      if (!theme) return;
      const root = document.documentElement;
      if (theme.bgColor) root.style.setProperty('--tg-theme-bg-color', theme.bgColor);
      if (theme.textColor) root.style.setProperty('--tg-theme-text-color', theme.textColor);
      // ... other themeParams
    }, [theme]);
    return null;
  }
  ```
- **Verify**: typecheck. With the SDK installed (T1.13), this component mounts cleanly in a client-side-only tree. In dev, open the dev tools and see `--tg-viewport-height` update when window is resized (the SDK has a web simulator that binds to window resize).
- **Commit**: `feat(telegram): add TelegramProvider binding viewport + theme CSS vars`
- **Depends on**: T1.13

---

#### T1.40 · `components/telegram/MainButton.tsx`

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/components/telegram/MainButton.tsx`
- **Action**:
  ```tsx
  'use client';
  import * as React from 'react';
  import { useMainButton } from '@telegram-apps/sdk-react';

  export interface MainButtonProps {
    text: string;
    onClick?: () => void;
    disabled?: boolean;
  }

  export function MainButton({ text, onClick, disabled }: MainButtonProps) {
    const mb = useMainButton();
    React.useEffect(() => {
      if (!mb) return;
      mb.setText(text);
      if (disabled) mb.disable(); else mb.enable();
      mb.show();
      const off = onClick ? mb.on('click', onClick) : undefined;
      return () => { mb.hide(); off?.(); };
    }, [mb, text, onClick, disabled]);
    return null;
  }
  ```
  Declarative wrapper. Phase 1 doesn't actually need the MainButton (the greeting has an inline CTA) — but shipping it here unlocks Phase 2+ wizard patterns.
- **Verify**: typecheck. Not actively rendered in Phase 1 screens but importable.
- **Commit**: `feat(telegram): add declarative <MainButton> wrapper`
- **Depends on**: T1.39

---

#### T1.41 · `components/telegram/BackButton.tsx`

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/components/telegram/BackButton.tsx`
- **Action**: mirror MainButton; binds to `useBackButton`. Phase 1 not rendered, Phase 2 wizard uses it.
- **Verify**: typecheck.
- **Commit**: `feat(telegram): add declarative <BackButton> wrapper`
- **Depends on**: T1.39

---

#### T1.42 · `app/(app)/layout.tsx` — route group layout (RSC + client providers)

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/app/(app)/layout.tsx`
- **Action**: RSC that sets up providers for the Mini App routes:
  ```tsx
  import { NextIntlClientProvider } from 'next-intl';
  import { getMessages, getLocale } from 'next-intl/server';
  import { TelegramProvider } from '@/components/telegram/TelegramProvider';
  import { QueryProvider } from '@/components/query/QueryProvider';
  import { AuthGate } from '@/features/auth/AuthGate';
  import { Screen } from '@/components/ui/layout/Screen';

  export default async function AppLayout({ children }: { children: React.ReactNode }) {
    const locale = await getLocale();
    const messages = await getMessages();
    return (
      <NextIntlClientProvider locale={locale} messages={messages}>
        <QueryProvider>
          <TelegramProvider>
            <AuthGate>
              <Screen>{children}</Screen>
            </AuthGate>
          </TelegramProvider>
        </QueryProvider>
      </NextIntlClientProvider>
    );
  }
  ```
  Also create:
  - `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/components/query/QueryProvider.tsx` — TanStack Query QueryClient + QueryClientProvider in a client component.
  - `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/features/auth/AuthGate.tsx` — client component that calls `/api/auth/session` with `window.Telegram.WebApp.initData` on mount, stores JWT in a React Context (or just in module-scoped var + supabase session), shows loading or error retry UI. On 401, re-sends initData.
- **Verify**: typecheck. When Mini App loads (via Telegram sim or real Telegram), AuthGate completes the auth flow and renders children. Build succeeds.
- **Commit**: `feat(web): add (app) route group layout with i18n + telegram + auth providers`
- **Depends on**: T1.14, T1.19, T1.23, T1.25, T1.26, T1.30, T1.39

---

#### T1.43 · `app/(app)/page.tsx` — home screen

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/app/(app)/page.tsx`
- **Action**: RSC page that renders greeting using `getTranslations('home')`:
  ```tsx
  import { getTranslations } from 'next-intl/server';
  import { Stack } from '@/components/ui/layout/Stack';
  import { Section } from '@/components/ui/layout/Section';
  import { CurrentUserGreeting } from '@/features/auth/CurrentUserGreeting';

  export default async function Home() {
    const t = await getTranslations('home');
    return (
      <Stack gap={4} className="px-4 py-6">
        <Section title={t('greeting', { name: '👤' })} description={t('description')}>
          <CurrentUserGreeting />
          <a href="/campaign/new" className="inline-flex min-h-[2.75rem] items-center justify-center rounded-lg bg-[var(--color-button)] px-4 text-[var(--color-button-text)]">
            {t('cta.create_campaign')}
          </a>
        </Section>
      </Stack>
    );
  }
  ```
  `CurrentUserGreeting` is a client component that reads the user from AuthGate's context and personalizes the greeting. Phase 1 just prints "Hi, {firstName}!" — no other data.
  Real Dashboard lands Phase 5. The `a href="/campaign/new"` is a placeholder — that route 404s until Phase 3 (which is fine, the CTA's purpose in Phase 1 is visual).
- **Verify**: In dev with valid initData, page renders "Hi, {name}!" localized.
- **Commit**: `feat(web): add Mini App home page (localized greeting + CTA placeholder)`
- **Depends on**: T1.42

---

#### T1.44 · Biome layout rules — activate

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/biome.json` (modify)
- **Action**: add `overrides` for `apps/web/features/**` and `apps/web/components/**` (except `ui/layout/**`):
  - `noRestrictedSyntax` rules to flag:
    - `CallExpression[callee.name="classList"][arguments.0.value=/100vh/]` (heuristic)
    - Class name strings matching `/\b100vh\b/` — manual review per D1.10; add as TODO with reasoning in a `biome.todos.md`.
  - Custom `noRestrictedImports` additions:
    - Forbid direct `from 'grammy'` inside `apps/web/components/**` (should live in `lib/telegram/**`)
  - Document layout-safe comment convention in CLAUDE.md §7 (new section): "Any `fixed | absolute | translate` CSS in `features/**` must carry `/* layout-safe: <reason> */` on the same line. PRs without are rejected."

  Biome 1.9 can't do regex-over-class-strings reliably — most layout rules stay documented in CLAUDE.md §7 + PR review until Phase 6 plugin. At minimum, add:
  - `files.include` for `apps/web/**/*.css` to Biome (not already)
  - Update `biome.json` schema for overrides (no new rules activate automatically, but the file records intent)
- **Verify**: `pnpm -w lint` still green. Added section in CLAUDE.md is coherent.
- **Commit**: `feat(lint): document Phase 1 layout rules in biome.json + CLAUDE.md §7`
- **Depends on**: T1.30–T1.37

---

### Wave H — Playwright visual regression baseline (T1.45 – T1.49)

Depends on Waves F (primitives exist) + G ((app) layout renders).

---

#### T1.45 · `apps/web/playwright.config.ts`

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/playwright.config.ts`
- **Action**:
  ```ts
  import { defineConfig, devices } from '@playwright/test';

  export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    retries: process.env.CI ? 1 : 0,
    reporter: [['html', { open: 'never' }], ['list']],
    use: { baseURL: 'http://localhost:3000' },
    projects: [
      // Trim per D1.5: 3 viewports × 2 themes × 2 locales = 12 permutations at the project level
      // (Phase 6 re-expands to full 18-matrix per R-13.10)
      { name: 'iphone-se-light-en', use: { ...devices['iPhone SE'], colorScheme: 'light', locale: 'en' }},
      { name: 'iphone-se-dark-en', use: { ...devices['iPhone SE'], colorScheme: 'dark', locale: 'en' }},
      { name: 'iphone-12-light-ru', use: { ...devices['iPhone 12'], colorScheme: 'light', locale: 'ru' }},
      { name: 'desktop-light-en', use: { viewport: { width: 1280, height: 720 }, colorScheme: 'light', locale: 'en' }},
      { name: 'desktop-dark-ru', use: { viewport: { width: 1280, height: 720 }, colorScheme: 'dark', locale: 'ru' }},
    ],
    webServer: {
      command: 'pnpm --filter @ai-job-bot/web dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  });
  ```
- **Verify**: `pnpm --filter @ai-job-bot/web exec playwright --version` prints version. Playwright browsers installed (`pnpm exec playwright install` — one-time).
- **Commit**: `test(web): add playwright config with trimmed 5-project matrix (Phase 1)`
- **Depends on**: T1.13

---

#### T1.46 · `apps/web/e2e/helpers/mock-init-data.ts`

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/e2e/helpers/mock-init-data.ts`
- **Action**: builds a valid HMAC-signed initData string from a test bot token + fake user payload. Mirror of `verify-init-data.ts` but forward direction:
  ```ts
  import { createHmac } from 'node:crypto';
  export function buildInitData(opts: { botToken: string; user: TelegramUser; authDate?: number }): string {
    const date = opts.authDate ?? Math.floor(Date.now()/1000);
    const params = new URLSearchParams({
      auth_date: String(date),
      user: JSON.stringify(opts.user),
      query_id: 'test-query',
    });
    const pairs = [...params.entries()].sort(([a],[b]) => a.localeCompare(b));
    const dataCheckString = pairs.map(([k,v]) => `${k}=${v}`).join('\n');
    const secret = createHmac('sha256', 'WebAppData').update(opts.botToken).digest();
    const hash = createHmac('sha256', secret).update(dataCheckString).digest('hex');
    params.set('hash', hash);
    return params.toString();
  }
  ```
  Used by Playwright tests to inject a valid session into `window.Telegram.WebApp.initData` via `page.addInitScript`.
- **Verify**: unit test against `verify-init-data` — round-trip passes.
- **Commit**: `test(web): add buildInitData e2e helper`
- **Depends on**: T1.14

---

#### T1.47 · `apps/web/e2e/screens/greeting.spec.ts` — visual regression

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/e2e/screens/greeting.spec.ts`
- **Action**:
  ```ts
  import { test, expect } from '@playwright/test';
  import { buildInitData } from '../helpers/mock-init-data';

  test.describe('Home greeting', () => {
    test.beforeEach(async ({ page }) => {
      const initData = buildInitData({
        botToken: 'TEST:TEST',
        user: { id: 123456, first_name: 'Vadym', language_code: 'en', is_premium: false },
      });
      await page.addInitScript((d) => {
        (window as any).Telegram = {
          WebApp: {
            initData: d,
            initDataUnsafe: {},
            themeParams: { bg_color: '#fff', text_color: '#000' },
            viewportHeight: window.innerHeight,
            viewportStableHeight: window.innerHeight,
            ready: () => {},
            expand: () => {},
          },
        };
      }, initData);
    });

    test('matches visual baseline', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('h1, h2'); // greeting rendered
      await expect(page).toHaveScreenshot('greeting.png', { fullPage: true, maxDiffPixelRatio: 0.01 });
    });
  });
  ```
  For this to pass, the app must accept the test bot token as valid → need a dev-mode bypass OR set `TELEGRAM_BOT_TOKEN=TEST:TEST` in `.env.test`. Simpler: conditional bypass in `verify-init-data.ts` when `process.env.NODE_ENV === 'test'` — document the bypass in `auth-skeleton.md` and warn loudly it never applies to prod builds. (Alternative: use a fixed test bot token in CI.)
- **Verify**: first run with `--update-snapshots` → creates `greeting-*.png` baseline per project. Second run (without the flag) → matches; otherwise fails.
- **Commit**: `test(web): add greeting visual regression baseline`
- **Depends on**: T1.43, T1.45, T1.46

---

#### T1.48 · `apps/web/e2e/screens/ui-contract.spec.ts`

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/e2e/screens/ui-contract.spec.ts`
- **Action**: same pattern, goto `/dev/ui-contract`, screenshot full page. One test per fixture locale (en/ru).
- **Verify**: 10 baselines generated (5 projects × 2 tests ≈ 10 screenshots).
- **Commit**: `test(web): add ui-contract fixture visual regression`
- **Depends on**: T1.38, T1.45, T1.46

---

#### T1.49 · CI workflow — add visual regression job

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/.github/workflows/ci.yml` (modify) + new `/Users/vadymmelnychenko/Projects/ai-job-bot/.github/workflows/visual.yml`
- **Action**:
  - New workflow `visual.yml` runs on PR only (skip on main per D1.14):
    - steps: checkout → pnpm → install → install playwright → run playwright against pre-built app
    - upload diff artifacts on failure
  - Document in `docs/features/ui-contract.md`: "To update baselines: on a PR, run `pnpm --filter @ai-job-bot/web exec playwright test --update-snapshots`, commit the resulting .png diff, push — reviewer approves deliberately."
- **Verify**: YAML valid; workflow file committed but can't actually run until there's a PR (no remote yet per Phase 0 state).
- **Commit**: `ci: add visual regression workflow (PR only, baselines generated on Phase 1 merge)`
- **Depends on**: T1.45

---

### Wave I — E2E auth flow + integration tests (T1.50 – T1.51)

---

#### T1.50 · E2E test `apps/web/e2e/auth.spec.ts`

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/e2e/auth.spec.ts`
- **Action**:
  ```ts
  test('initData → JWT → users row exists', async ({ page, request }) => {
    const initData = buildInitData({ botToken: env.TEST_BOT_TOKEN, user: { id: 987654321, first_name: 'Test', language_code: 'it' }});
    const res = await request.post('/api/auth/session', {
      headers: { authorization: `Tma ${initData}` },
    });
    expect(res.status()).toBe(200);
    const { jwt, user } = await res.json();
    expect(user.telegramId).toBe(987654321);
    expect(user.locale).toBe('it');
    // Verify DB row via service role client
    const supabase = createServiceRoleClient();
    const { data } = await supabase.from('users').select('*').eq('telegram_id', 987654321).single();
    expect(data).toBeTruthy();
    expect(data?.locale).toBe('it');
  });
  ```
- **Verify**: with Supabase local running + Phase 1 app running + test bot token set, test passes.
- **Commit**: `test(web): e2e auth session flow (initData → JWT → users row)`
- **Depends on**: T1.23, T1.46

---

#### T1.51 · Integration test `verify-init-data.test.ts` (already in T1.14 — expand)

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/apps/web/lib/telegram/verify-init-data.test.ts` (expand from T1.14)
- **Action**: add cases:
  - Valid signature, auth_date 5 seconds old, maxAge=60 → OK
  - Valid signature, auth_date 3600 seconds old, maxAge=60 → StaleInitDataError
  - Tampered `user=` (change `id`) → InvalidInitDataSignatureError
  - Missing `hash` param → MalformedInitDataError
  - `hash` with wrong case (uppercase) → compare as lowercase, still matches
- **Verify**: all cases pass. Confirm via intentional test of known-bad initData.
- **Commit**: `test(web): expand verify-init-data coverage to cover stale/tampered/malformed cases`
- **Depends on**: T1.14

---

### Wave J — Ritual artifacts (T1.52 – T1.62)

All docs tasks are parallelizable.

---

#### T1.52 · `docs/features/auth-skeleton.md`

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/docs/features/auth-skeleton.md`
- **Action**: 80-150 lines. Sections:
  - **Purpose** — why custom HMAC+JWT instead of Supabase Auth.
  - **Data flow** — ASCII diagram from plan file §Auth Flow.
  - **HMAC math** — data-check-string construction, secret key derivation, signature check.
  - **JWT lifetime** — 15 min access; silent re-auth on 401 via re-sending initData.
  - **RLS interplay** — `sub` claim = `users.id`, policies use `auth.uid()`.
  - **Edge cases** — stale initData (24h read / 1h payment), Telegram Desktop quirks (reload vs reopen), refresh loop prevention.
  - **Dev loop** — ngrok setup, `pnpm set-webhook`, re-registering on ngrok URL change.
  - **Testing** — test bot token bypass rule, warning it never applies in prod.
- **Verify**: file exists; cross-references ADR 0004 + verify-init-data.ts + session.ts.
- **Commit**: `docs(features): add auth-skeleton.md`
- **Depends on**: T1.14, T1.15, T1.22, T1.23

---

#### T1.53 · `docs/features/ui-contract.md`

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/docs/features/ui-contract.md`
- **Action**: 100-180 lines. Sections:
  - **Design tokens** — the CSS vars bridge (Telegram themeParams → `--color-*`; viewport → `--tg-viewport-height`).
  - **Primitive API reference** — one paragraph per primitive (Screen, Stack, Row, Section, Scroll, FieldGroup, Clamp, HScroll) with props + usage example.
  - **Viewport matrix** — R-13.1 list; trimmed vs full matrix rationale (D1.5).
  - **Locale stress testing** — en-short / ru-long / x-loud fixture; how to add a new fixture.
  - **Common pitfalls** — `100vh` vs var, missing `min-w-0`, unlabeled `fixed` positioning.
  - **Visual regression workflow** — first baseline blessing (D1.7, D1.14); update flow on PRs; Phase 6 expansion path.
- **Verify**: references all primitives + ADR 0005.
- **Commit**: `docs(features): add ui-contract.md`
- **Depends on**: T1.30–T1.38, T1.45–T1.49

---

#### T1.54 · `docs/features/i18n-skeleton.md`

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/docs/features/i18n-skeleton.md`
- **Action**: 60-100 lines:
  - **Key naming convention** — `{screen}.{section}.{key}`; explain nesting rules.
  - **How to add a key** — 3-step recipe: add to en.json → copy-paste-prefix to 4 other files → use `t('key')`.
  - **Locale fallback strategy** — DB > cookie > Accept-Language > 'en'.
  - **Phase 6 translation workflow** — LLM-assisted + native speaker review; diff script to find untranslated `[UK]`/etc prefixes.
  - **Enforcement** — reference CLAUDE.md §6 (D1.10, T1.29).
- **Verify**: covers all 5 locales; cross-references detect-locale.
- **Commit**: `docs(features): add i18n-skeleton.md`
- **Depends on**: T1.25, T1.26, T1.29

---

#### T1.55 · `docs/features/bot-commands.md`

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/docs/features/bot-commands.md`
- **Action**: 60-100 lines. Table of commands (handler file:line, Mini App route, inline-button label, Phase 5 note for `/status`).
- **Verify**: references `apps/web/lib/telegram/bot.ts`.
- **Commit**: `docs(features): add bot-commands.md`
- **Depends on**: T1.17

---

#### T1.56 · ADR `docs/DECISIONS/0004-telegram-initdata-auth.md`

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/docs/DECISIONS/0004-telegram-initdata-auth.md`
- **Action**: standard ADR format.
  - **Status**: Accepted 2026-04-XX.
  - **Context**: Need to authenticate Mini App users. Options: (a) Supabase Auth with Telegram as OIDC — not natively supported; (b) anonymous + client-side user id — trivial to spoof; (c) custom HMAC of Telegram's signed initData + mint our own Supabase JWT.
  - **Decision**: (c). Verify `initData` server-side, upsert into `users`, sign Supabase JWT with `sub = users.id`, 15-min expiry. RLS policies key off `auth.uid()`.
  - **Consequences**: Telegram is our IdP — if Telegram's signing scheme changes, we adapt. No password management, no email verification, no OAuth redirect. Downside: tied to Telegram; to support another entry point (web, mobile app), we'd add a second auth path. Acceptable — MVP is Telegram only.
  - **Alternatives considered**: Auth.js with a custom Telegram provider (rejected: re-introduces a cookie session layer we don't want; RLS coupling is better); 3rd-party Telegram auth widgets (rejected: worse UX, requires redirect).
- **Verify**: file exists; format matches ADRs 0001-0003.
- **Commit**: `docs(adr): 0004 telegram initdata auth flow`
- **Depends on**: T1.15

---

#### T1.57 · ADR `docs/DECISIONS/0005-responsive-ui-contract.md`

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/docs/DECISIONS/0005-responsive-ui-contract.md`
- **Action**: ADR:
  - **Status**: Accepted.
  - **Context**: Telegram Mini Apps run across iOS/Android/Desktop, dynamic viewport (keyboard), 5 locales with very different string lengths. Uncontrolled layout = perpetual overflow bugs.
  - **Decision**: Ship 8 layout primitives (`Screen`, `Stack`, `Row`, `Section`, `Scroll`, `FieldGroup`, `Clamp`, `HScroll`) with enforced rules (no `100vh`, no fixed pixel widths in features, `min-w-0` by default). Playwright visual regression across trimmed (Phase 1) / full (Phase 6) matrix. Biome rules where possible; CLAUDE.md review rules where not.
  - **Consequences**: Every new screen inherits layout safety. Visual regressions caught pre-merge. Cost: slight learning curve (devs pick `<Screen>` + `<Stack>` instead of raw `<div>`); baselines require deliberate blessing.
  - **Alternatives**: (a) style audit per PR — too expensive; (b) full Storybook + Chromatic — overkill for solo+Claude workflow; (c) no contract, fix bugs as they come — unacceptable, R-13 is explicit.
- **Verify**: file exists.
- **Commit**: `docs(adr): 0005 responsive ui contract`
- **Depends on**: T1.44, T1.49

---

#### T1.58 · `docs/CHANGELOG.md` — append Phase 1 entry

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/docs/CHANGELOG.md` (modify: append)
- **Action**: append section:
  ```markdown
  ## Phase 1 — Bot + Mini App skeleton + auth (2026-04-XX → 2026-04-YY)

  **Observable outcome:** `/start` → Mini App opens → localized greeting → `users` row upserted. Bot commands registered. Responsive UI Contract primitives shipped + visual baseline.

  ### Added
  - `users` table + RLS policies (`20260418000000_users.sql`, `_rls.sql`).
  - Telegram initData HMAC verification (`lib/telegram/verify-init-data.ts`) + session resolver + auth middleware.
  - Supabase service-role + browser clients; `SupabaseUserRepo` adapter for the core `UserRepo` port.
  - `signSupabaseJwt` via `jose` — 15-minute `authenticated`-role JWT with `sub=users.id`.
  - grammY bot singleton + 5 command handlers (`/start /new /profile /status /help`); `setMyCommands` sync.
  - `/api/bot/webhook` (secret-token verified) + `/api/auth/session` (initData → JWT).
  - `scripts/set-webhook.ts` one-shot webhook registration.
  - `packages/core/domain/user.ts`, `domain/locale.ts`, `application/upsert-user.ts` — TDD'd.
  - `@telegram-apps/sdk-react` v2 TelegramProvider binding viewport + theme to CSS vars.
  - next-intl 3 with 5 locale files (EN real, UK/RU/IT/PL placeholders).
  - Responsive UI Contract primitives: `<Screen>`, `<Stack>`, `<Row>`, `<Section>`, `<Scroll>`, `<FieldGroup>`, `<Clamp>`, `<HScroll>`.
  - `/dev/ui-contract` visual regression fixture.
  - Playwright + baseline visual regression for home greeting + ui-contract fixture.
  - CI: visual regression workflow (PR only).
  - ADRs 0004 (initData auth), 0005 (responsive UI contract).
  - Feature docs: auth-skeleton, ui-contract, i18n-skeleton, bot-commands.

  ### Changed
  - `.env.example`: `TELEGRAM_WEBHOOK_SECRET` → `TELEGRAM_WEBHOOK_SECRET_TOKEN`; added `NEXT_PUBLIC_MINI_APP_URL`.
  - `packages/db/types/generated.ts`: regenerated to include `users` table shape.
  - CLAUDE.md §6 (i18n rule) and §7 (layout-safe comments) expanded.

  ### Notes
  - Visual regression matrix is trimmed to 5 projects in Phase 1 (D1.5); full 18-permutation matrix activates in Phase 6.
  - Biome i18n + layout linting is documented-but-manual (D1.10); automated enforcement lands Phase 6.
  - ngrok dev tunnel pattern documented in `auth-skeleton.md`; free ngrok URL changes per session (re-run `set-webhook`).
  ```
- **Verify**: Markdown valid; links work.
- **Commit**: `docs: append CHANGELOG phase 1 entry`
- **Depends on**: (appended last before verify)

---

#### T1.59 · `docs/PROJECT-MAP.md` — update to v1

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/docs/PROJECT-MAP.md` (modify)
- **Action**: update sections:
  - **Live Systems**: Bot status = "registered (via BotFather, 2026-04-XX); commands synced". Mini App = "served on localhost via ngrok URL <redacted>". DB = "Supabase local running, `users` table live".
  - **Data Model**: add row `users` ✅.
  - **Flows Working E2E**: move `/start → users row` from ⏳ to ✅.
  - **Active Features**: add `auth-skeleton`, `ui-contract`, `i18n-skeleton`, `bot-commands`.
  - **Env Vars Required**: mark Phase 1 vars present with tick.
  - **Open Issues**: none critical. Note "ngrok URL rotates per session — remember to re-run `pnpm set-webhook`".
  - **How to Resume From Cold**: update step 6 to also run `pnpm --filter @ai-job-bot/db db:start`.
- **Verify**: diff shows Phase 0→1 state transitions cleanly.
- **Commit**: `docs: update PROJECT-MAP to v1 (phase 1 live state)`
- **Depends on**: T1.5, T1.17, T1.22

---

#### T1.60 · `docs/SESSION-LOG.md` — append Phase 1 entries

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/docs/SESSION-LOG.md` (modify)
- **Action**: append two entries:
  - One for planning (this plan file being written).
  - One for execution (filled in at execution time — a stub now with `[filled during exec]`).
  Include: key decisions (D1.1-D1.18), user checkpoint interactions (BotFather, ngrok), any deviations, next phase prompt.
- **Verify**: Markdown appended, chronologically ordered.
- **Commit**: `docs: append SESSION-LOG phase 1 entries`
- **Depends on**: (last)

---

#### T1.61 · `CLAUDE.md` — update if new rules emerged

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/CLAUDE.md` (modify)
- **Action**: add/expand sections as per D1.16 + D1.10:
  - §6 (i18n) — manual review rule (T1.29).
  - §7 (new) — **Layout safety**. Enumerate Responsive UI Contract rules (no `100vh`, use `<Scroll>`, `<HScroll>`, `/* layout-safe */` comments).
  - §17 (new) — **Auth rule** (server-only on `lib/supabase/server.ts`, `lib/auth/jwt.ts`; never import them from client code; never log raw initData).
  - §18 (new) — **Bot command webhook secret** — always pass `secret_token` to `setWebhook`; reject any webhook POST missing the header.
- **Verify**: file reads coherently; new sections have the same format as existing.
- **Commit**: `docs: update CLAUDE.md with Phase 1 rules (§6 i18n manual, §7 layout, §17 auth, §18 webhook secret)`
- **Depends on**: T1.29, T1.44, T1.56

---

#### T1.62 · `.planning/phases/1/verify.md` — verification proof stub (filled at execute-phase end)

- **Files**: `/Users/vadymmelnychenko/Projects/ai-job-bot/.planning/phases/1/verify.md`
- **Action**: create proof document template matching Phase 0's `verify.md`. Include sections 1-12 + ritual checklist; leave command outputs as `[filled at execution]`.
  Outline sections:
  1. Observable outcome claim
  2. `pnpm install` clean
  3. `pnpm -w typecheck`, `lint`, `build`, `test:unit` green
  4. Supabase local + `users` table + RLS policies active (show `\d public.users` output, show failed insert from anon)
  5. `pnpm set-webhook` successful → Telegram `getWebhookInfo` confirms
  6. Real `/start` in Telegram → bot replies + Mini App opens (screenshot mandatory)
  7. Mini App greeting in locale auto-detected from Telegram language (screenshot)
  8. `users` row visible in Studio (screenshot with telegram_id, locale filled)
  9. Layer boundary rule: `packages/core` rejects `import 'grammy'` (demonstrate)
  10. Playwright baseline: visual screenshots present, `playwright test --reporter=list` passes
  11. Unit test coverage in `packages/core` (upsertUser, locale detect, user entity)
  12. Integration test `verify-init-data` covers valid/stale/tampered/malformed
  13. Per-Phase Ritual Checklist R-15.1 to R-15.10
- **Verify**: file exists with placeholders.
- **Commit**: `docs: add phase 1 verify.md template (outcomes filled at execution)`
- **Depends on**: (created early as placeholder; filled during Wave K)

---

### Wave K — Final verification (T1.63 – T1.65)

---

#### T1.63 · `pnpm install && pnpm -w typecheck && lint && build && test:unit` — all green

- **Files**: none (verification).
- **Action**:
  ```bash
  pnpm install
  pnpm -w typecheck
  pnpm -w lint
  SKIP_ENV_VALIDATION=1 pnpm -w build
  pnpm -w test:unit
  ```
  Paste output into verify.md section 3.
- **Verify**: all five commands exit 0. Test count includes the new `packages/core` TDD tests (≥15 tests: user entity, locale detect, upsertUser cases, verify-init-data cases).
- **Commit**: (no commit — verification)
- **Depends on**: all T1.1-T1.62

---

#### T1.64 · Start dev + synthesize initData → assert users row exists

- **Files**: none (verification).
- **Action**:
  1. Start `pnpm dev` in background.
  2. Build a valid initData via a one-liner:
     ```
     node -e "require('./apps/web/e2e/helpers/mock-init-data').buildInitData(...)"
     ```
  3. `curl -s -H "Authorization: Tma <initData>" -X POST http://localhost:3000/api/auth/session` → expect 200 + JWT in body.
  4. `supabase db query "select count(*) from public.users where telegram_id=..."` → expect 1.
  5. Kill dev.
- **Verify**: step 3 returns 200 with `{ jwt, user, expiresAt }`; step 4 returns 1.
- **Commit**: (no commit — verification)
- **Depends on**: T1.63

---

#### T1.65 · BotFather bot + `set-webhook` + real `/start` from phone → Mini App opens → greeting → DB row **[CHECKPOINT: user's phone]**

- **Files**: none (verification + screenshots).
- **Action**:
  1. `pnpm dev` + `ngrok http 3000` in separate terminals.
  2. `NEXT_PUBLIC_MINI_APP_URL=<ngrok-url> pnpm set-webhook`.
  3. User opens Telegram on phone, finds their bot (search by username), sends `/start`.
  4. Bot replies: "Welcome! Tap to open the app." with "Open App" inline button.
  5. User taps → Mini App opens in WebView → greeting renders in their device locale.
  6. User screenshots the bot reply + Mini App greeting.
  7. Developer (or user) opens Supabase Studio → `users` table → confirms row with correct `telegram_id`, `locale`.
  8. Paste screenshots + DB screenshot into `.planning/phases/1/verify.md` section 6-8.
- **Verify**: all steps succeed. Especially: locale auto-detected matches device Telegram language.
- **Commit**: N/A (verification, screenshots live in verify.md)
- **Depends on**: T1.64, user action

---

## 3. Dependency Graph (waves A-K)

```
Phase 0 complete
    ↓
┌──────────── Wave A (Supabase) ────────────┐ ┌──── Wave B (core TDD, parallel) ────┐
│                                            │ │                                     │
│ T1.1 (supabase start) ─── BLOCKER-A        │ │ T1.6 (user entity)                  │
│   ↓                                        │ │ T1.8 (clock port)                   │
│ T1.2 (users migration)                     │ │ T1.12 (locale)                       │
│   ↓                                        │ │   ↓                                 │
│ T1.3 (RLS)                                 │ │ T1.7 (user-repo port) ← T1.6        │
│   ↓                                        │ │ T1.9 (fakes) ← T1.7, T1.8           │
│ T1.4 (ext audit) — no-op                   │ │ T1.10 (builder) ← T1.6              │
│ T1.5 (db:types regen) ← T1.3               │ │ T1.11 (upsertUser) ← T1.7/9/10/12   │
│                                            │ │                                     │
└────────────────────┬───────────────────────┘ └───────────────┬─────────────────────┘
                     └──────────────────┬────────────────────────┘
                                        ↓
                          Wave C (infra adapters) ← needs Waves A + B
                          T1.13 (deps + env) ─┬→ T1.14 (verify-init-data)
                                              ├→ T1.18 (supabase server + UserRepo adapter) ← T1.5, T1.7
                                              ├→ T1.19 (supabase browser)
                                              ├→ T1.20 (types re-export)
                                              ├→ T1.21 (jwt sign)
                                              └→ T1.17 (bot) — BLOCKER-B
                            T1.15 (session) ← T1.14, T1.18, T1.21, T1.11
                            T1.16 (middleware) ← T1.15
                                        ↓
                          Wave D (API routes)
                          T1.22 (webhook) ← T1.17
                          T1.23 (auth/session) ← T1.15
                          T1.24 (set-webhook script) ← T1.17, T1.22 — BLOCKER-C
                                        ↓
    ┌──── Wave E (i18n, parallel with F+G start) ────┐   ┌──── Wave F (UI primitives) ────┐
    │ T1.25 (messages) ← T1.13                       │   │ T1.30-T1.37 (primitives) ← T1.13│
    │ T1.26 (i18n req config) ← T1.12, T1.25         │   │ T1.38 (/dev/ui-contract) ← 30-37,25│
    │ T1.27 (middleware)                             │   │                                 │
    │ T1.28 (LocaleSwitcher) ← T1.12                 │   └─────────────────────────────────┘
    │ T1.29 (CLAUDE.md §6)                           │                  ↓
    └────────────────────────────────────────────────┘   ┌──── Wave G (Mini App integration) ────┐
                         ↓                                │ T1.39 (TelegramProvider) ← T1.13        │
                         ↓                                │ T1.40 (MainButton) ← T1.39              │
                         ↓                                │ T1.41 (BackButton) ← T1.39              │
                         ↓                                │ T1.42 ((app) layout) ← T1.14/19/23/25/26/30/39 │
                         ↓                                │ T1.43 (home page) ← T1.42               │
                         ↓                                │ T1.44 (biome rules) ← T1.30-37          │
                         ↓                                └─────────────────────────────────────────┘
                         ↓                                              ↓
                                          Wave H (Playwright baseline)
                                          T1.45 (config) ← T1.13
                                          T1.46 (mock-init-data) ← T1.14
                                          T1.47 (greeting spec) ← T1.43, T1.45, T1.46
                                          T1.48 (ui-contract spec) ← T1.38, T1.45, T1.46
                                          T1.49 (CI workflow) ← T1.45
                                                         ↓
                                          Wave I (E2E + integration)
                                          T1.50 (auth E2E) ← T1.23, T1.46
                                          T1.51 (verify-init-data expand) ← T1.14
                                                         ↓
                                          Wave J (ritual docs) — all parallelizable
                                          T1.52-T1.61
                                                         ↓
                                          Wave K (final verify)
                                          T1.63 → T1.64 → T1.65 (user phone)
```

**Parallelizable clusters (safe to batch):**
- **Wave A + Wave B in parallel** after Phase 0 complete (A is SQL + Supabase, B is pure TS — zero overlap).
- **Within Wave B**: T1.6, T1.8, T1.12 independent; then T1.7, T1.9, T1.10 in parallel once T1.6 done; then T1.11 last.
- **Within Wave C**: T1.14, T1.18, T1.19, T1.20, T1.21 all parallel after T1.13. T1.17 blocked on BLOCKER-B. T1.15 joins after.
- **Wave E + Wave F + Wave G**: E and F fully parallel; G partially (T1.39, T1.40, T1.41 can go in parallel with E and F, but T1.42 waits for both to complete).
- **Wave H + Wave I**: sequential after G.
- **Wave J**: 10 doc tasks, all parallel.
- **Wave K**: strictly sequential; T1.65 is user-gated.

**Serial critical path (longest chain of forced sequence):**
T1.1 → T1.2 → T1.3 → T1.5 → T1.13 → T1.14 → T1.15 → T1.22 → T1.24 (user checkpoint) → T1.42 → T1.43 → T1.45 → T1.47 → T1.63 → T1.64 → T1.65.

---

## 4. Risks & Unknowns

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **BLOCKER-A** — Docker Desktop not running when T1.1 fires. | Medium | T1.1 blocks; can't proceed to Waves A–I. | T1.1 preflight checks `docker info`. Prompts user to start Docker Desktop. Alternative: switch to Supabase cloud project (documented in SESSION-LOG as fallback). |
| **BLOCKER-B** — User hasn't opened @BotFather yet. | High | T1.17 blocks; T1.22, T1.24, T1.65 all gated. | T1.17 prompts with full instructions (token, secret, URL, menu button). Wait for user's "continue". Document flow in `auth-skeleton.md`. |
| **BLOCKER-C** — No public HTTPS URL (no ngrok / no Vercel). | High | T1.24 blocks. | T1.24 prompts with two options (ngrok preferred for dev, Vercel for cloud). Free ngrok rotation pattern documented. |
| **`@telegram-apps/sdk-react` v2 breaking changes** — rapidly evolving SDK. | Medium | TelegramProvider compile errors or runtime unmount loops. | Pin exact version via `pnpm add @telegram-apps/sdk-react@2.x.y`; smoke-test immediately; fallback to raw `window.Telegram.WebApp` (documented adapter path) if SDK issue blocks. |
| **next-intl 3 RSC cache interaction** — translations cached across requests; locale flip may be sticky. | Low | LocaleSwitcher doesn't apply until hard reload. | T1.28 already does `location.reload()`; document the limitation. |
| **initData format varies by Telegram client** (Desktop vs iOS vs Android). | Medium | `verify-init-data` may fail silently for one client. | Testing with real device (T1.65) is mandatory before phase completion. Document client-specific quirks in `auth-skeleton.md`. |
| **Supabase `setSession` without refresh token** — `refresh_token: ''` may fail some checks. | Medium | Client RLS queries return empty despite valid JWT. | Pass empty string per documented pattern; if it breaks, switch to direct JWT passthrough via Authorization header on REST requests. |
| **`jose` + Edge runtime compat** — we're using Node runtime for API routes, but future Edge migration may break. | Low | Not a Phase 1 concern; notable for Phase 7. | Pin Node runtime on all API routes. |
| **Playwright visual regression flakiness on fonts** — local dev may render serif vs CI sans-serif. | Medium | Tiny pixel diffs fail CI. | `--threshold 0.2` and `maxDiffPixelRatio: 0.01` allow minor aliasing. Document the blessing ceremony on first PR. |
| **`pnpm db:types` + uncommitted migrations** — regenerating against a dirty DB state. | Low | `generated.ts` reflects unsaved changes. | Rule: run `db:reset` before `db:types`. Add to RUNBOOK in Phase 7. |
| **RLS policies blocking service role accidentally** — easy to mis-type `auth.uid()`. | Low | Service role can still insert — no blocker. Verify with test. | T1.3's RLS explicitly has no policy for insert (service role bypasses RLS). T1.50 E2E proves service role can insert. |
| **ngrok URL rotation** — user re-runs dev after lunch, webhook URL is stale. | High (recurring) | `/start` in Telegram silently times out (no error to user). | `docs/features/auth-skeleton.md` prominent section: "Every dev session: restart ngrok → re-run `pnpm set-webhook`." |
| **Biome version drift** — 1.9 vs 2.0 soon. | Low | Config format may change. | Pin to `1.9.x` explicitly; upgrade in dedicated PR when 2.0 is stable. |
| **`requireAuth` middleware caching bug** — re-resolves session on every request (performance). | Medium | Slow request-per-request but not incorrect. | Acceptable Phase 1; optimize with Redis/in-memory cache in Phase 7 load-test phase. |
| **Dev bypass of `verify-init-data` for tests leaks to prod** — security critical. | Low | Catastrophic. | Bypass guarded by `process.env.NODE_ENV === 'test'` AND a specific `TEST_BOT_TOKEN` value AND a CI env flag. Three-condition gate. Documented in ADR 0004 as explicit trade-off. |
| **Locale detection mismatch** — Telegram `language_code='en-us'` lowercased vs `'en-US'`. | Low | One user gets fallback `'en'` despite wanting English (ok). | `detectLocale` lowercases + splits on `-`. Covered by T1.12 tests. |

None are showstoppers; all have concrete mitigations or user-prompt gates.

---

## 5. Verification Section (Phase 1 acceptance criteria, explicit)

Run these after all 65 tasks complete. Paste outputs into `.planning/phases/1/verify.md`.

```bash
cd /Users/vadymmelnychenko/Projects/ai-job-bot

# 1. Install clean
pnpm install

# 2. Typecheck + lint + build + test:unit green
pnpm -w typecheck
pnpm -w lint
SKIP_ENV_VALIDATION=1 pnpm -w build
pnpm -w test:unit

# 3. Supabase local running + users table + RLS live
pnpm --filter @ai-job-bot/db db:start
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "\d public.users"
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "\d+ public.users"  # shows RLS policies

# 4. Layer boundary — core rejects grammy
echo "import 'grammy'; export const x = 1;" > packages/core/src/__layer_test.ts
pnpm -w lint packages/core/src/__layer_test.ts   # expect noRestrictedImports failure
rm packages/core/src/__layer_test.ts

# 5. Playwright baseline exists
ls apps/web/e2e/screens/*.png apps/web/e2e/screens/**/*.png 2>/dev/null | head

# 6. Visual regression passes (compare mode)
pnpm --filter @ai-job-bot/web exec playwright test --reporter=list
# expect all projects green

# 7. Integration: auth session flow via curl
pnpm dev &
DEV_PID=$!
sleep 4
INIT_DATA=$(node -e "
  const {buildInitData} = require('./apps/web/e2e/helpers/mock-init-data');
  console.log(buildInitData({botToken: process.env.TELEGRAM_BOT_TOKEN, user: {id: 999, first_name: 'Verify', language_code: 'uk'}}));
")
RESP=$(curl -s -H "Authorization: Tma $INIT_DATA" -X POST http://localhost:3000/api/auth/session)
echo "$RESP" | jq -e '.user.locale == "uk"'
echo "$RESP" | jq -e '.jwt | length > 100'
# Verify row exists
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select count(*) from public.users where telegram_id=999"
# expect count=1
kill $DEV_PID

# 8. Webhook endpoint rejects without secret header
pnpm dev &
DEV_PID=$!
sleep 4
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/bot/webhook -d '{}' -H "Content-Type: application/json"
# expect 401 (grammy's webhookCallback rejects missing secret)
kill $DEV_PID

# 9. Real Telegram flow (user-gated)
# (follow T1.65 — manual; paste screenshots into verify.md)

echo "Phase 1 acceptance: ALL GREEN"
```

**Phase 1 is DONE when:**
1. All 65 tasks committed (or explicitly deferred with a SESSION-LOG note).
2. Verification block above exits 0 end-to-end.
3. `.planning/phases/1/verify.md` contains real command outputs + real phone screenshots for T1.65.
4. Per-phase ritual checklist (below) has all applicable boxes checked.

---

## 6. Per-Phase Ritual Checklist (from REQUIREMENTS R-15)

Verify before declaring Phase 1 complete.

- [ ] **R-15.1** Code + tests green (typecheck + lint + build + unit + e2e + visual all pass)
- [ ] **R-15.2** `docs/features/auth-skeleton.md`, `ui-contract.md`, `i18n-skeleton.md`, `bot-commands.md` created
- [ ] **R-15.3** `docs/CHANGELOG.md` appended with Phase 1 entry
- [ ] **R-15.4** `docs/PROJECT-MAP.md` reflects v1 state (users table live, bot registered, Mini App boots)
- [ ] **R-15.5** `docs/SESSION-LOG.md` appended with Phase 1 planning + execution entries (including BotFather + ngrok interactions)
- [ ] **R-15.6** `CLAUDE.md` (root) updated: §6 i18n rule, §7 layout safety, §17 auth rule, §18 webhook secret
- [ ] **R-15.7** ADRs 0004 (Telegram initData auth), 0005 (Responsive UI contract) written
- [ ] **R-15.8** Auto-memory note saved IF cross-session insight emerged (candidate: "ngrok URL rotates — re-run `pnpm set-webhook` every dev session"; save if cross-project worth it)
- [ ] **R-15.9** `.planning/phases/1/verify.md` shows proof of working outcome with pasted command output + real-device screenshots
- [ ] **R-15.10** Typecheck + build + lint green (restates R-15.1; R-15 has 10 items as the canonical list)

---

## 7. Appendix — Critical dependencies + recommendations

- **ngrok** (recommended dev tunnel). Install: `brew install ngrok` or `curl -sSf https://ngrok.com/download/linux/amd64 -o ngrok.zip`. Free tier = URL rotation per session. Paid = static URL ($10/month); consider for Phase 7 production if Vercel preview not sufficient.
- **Cloudflare Tunnel** (alternative). `brew install cloudflared`; `cloudflared tunnel --url http://localhost:3000`. Generates stable URL in a free Cloudflare account; documented in `auth-skeleton.md` as option B.
- **Vercel preview** (full alternative). Requires Vercel account + Supabase cloud project. Better for pre-production testing in Phase 7.

**Open user decisions (not blocking Phase 1 start):**
- Whether to create GitHub remote during Phase 1 (was deferred in Phase 0 per T0.40). No code change — a `git push` moment.
- Whether to pin ngrok URL via paid plan or rely on re-`set-webhook` each session.
- Whether to start Supabase cloud project now (Phase 7 default) or continue local-only through Phase 6.

Recommendation: defer all three to the end of Phase 1 as a single user-chat — none block the work.
