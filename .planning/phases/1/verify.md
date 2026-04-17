---
phase: 1
phase_name: Bot + Mini App skeleton + auth
verified_on: 2026-04-17
verifier: Claude (autonomous night pass)
status: code+docs+cloud-migrations shipped; user checkpoints outstanding
---

# Phase 1 Verification

## 1. Observable outcome

> `/start` in Telegram → Mini App opens → localized greeting renders → `users` row upserted.
> Bot commands (`/start /new /profile /status /help`) registered. Responsive UI Contract
> primitives shipped with visual-regression fixture.

Progress against outcome:
- [x] `/` route in the Mini App renders greeting from initData via `app/(app)/page.tsx`
      (unit-tested, local build green).
- [x] `users` row upsert flow wired end-to-end: `initData` → `resolveSession` →
      `SupabaseUserRepo.upsert` → Supabase Cloud insert. Covered by 4 integration tests
      (auto-run when Supabase reachable).
- [x] Bot `setMyCommands` + handlers for all 5 commands in
      `apps/web/lib/telegram/bot.ts`.
- [x] Responsive UI Contract primitives shipped (`components/ui/layout/*.tsx`) + dev
      fixture `/ui-contract`.
- [ ] Real device `/start` from phone → screenshots — **user-gated** (see §9 below).

## 2. `pnpm install` clean

Ran against the frozen lockfile via Vercel build logs — 334 packages resolved, 0 conflicts.
Local workspaces bound via pnpm 10 symlinks. Lockfile v9, pnpm 10.18.0 as declared in
`packageManager`.

## 3. Typecheck / lint / build / tests

Captured 2026-04-17 02:30 local:

```
$ pnpm -w typecheck
 Tasks:    3 successful, 3 total
Cached:    3 cached, 3 total
  Time:    12ms >>> FULL TURBO

$ pnpm -w lint
Checked 78 files in 6ms. No fixes applied.
Found 1 warning.
# (warning is an informational "suppressions/unused" on packages/core/src/domain/user.test.ts:99
# — redundant `// biome-ignore noExplicitAny` after the test-file override landed. Harmless.)

$ pnpm -w test
@ai-job-bot/core:test:  Test Files  4 passed (4)
@ai-job-bot/core:test:       Tests  39 passed (39)
@ai-job-bot/web:test:  Test Files  4 passed (4)
@ai-job-bot/web:test:       Tests  23 passed (23)
 Tasks:    3 successful, 3 total

$ pnpm -w build   # reads apps/web/.env.local
(next build succeeds with all 3 API routes + / + /ui-contract marked as dynamic/static
 respectively; no env validation errors.)
 Tasks:    1 successful, 1 total
```

Total test count: **62** passing (39 core + 23 web). Zero failures.

## 4. Supabase Cloud migrations applied

Project: `fixvzokjvqgqyzdidabo`, region `eu-central-2`, wired via Vercel Marketplace.

Command used (bypasses `supabase login` OAuth):
```
cd packages/db
supabase db push --db-url "$POSTGRES_URL_NON_POOLING" --include-all
```

Output:
```
Applying migration 20260417000000_init.sql...
NOTICE (42710): extension "pgcrypto" already exists, skipping
NOTICE (42710): extension "uuid-ossp" already exists, skipping
Applying migration 20260418000000_users.sql...
Applying migration 20260418000100_users_rls.sql...
Finished supabase db push.
```

Verified via direct psql:
```
$ psql "$POSTGRES_URL_NON_POOLING" -c '\d public.users'
                               Table "public.users"
   Column    |           Type           | Nullable |      Default
-------------+--------------------------+----------+-------------------
 id          | uuid                     | not null | gen_random_uuid()
 telegram_id | bigint                   | not null |
 username    | text                     |          |
 first_name  | text                     |          |
 last_name   | text                     |          |
 locale      | text                     | not null | 'en'::text
 is_premium  | boolean                  | not null | false
 timezone    | text                     |          |
 created_at  | timestamp with time zone | not null | now()
 updated_at  | timestamp with time zone | not null | now()
Indexes:
    "users_pkey" PRIMARY KEY, btree (id)
    "users_telegram_id_idx" btree (telegram_id)
    "users_telegram_id_key" UNIQUE CONSTRAINT, btree (telegram_id)
Policies:
    POLICY "users_self_read" FOR SELECT USING ((id = auth.uid()))
    POLICY "users_self_update" FOR UPDATE USING ((id = auth.uid()))
      WITH CHECK ((id = auth.uid()))
Triggers:
    users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at()

$ psql ... -c "select count(*) from public.users;"
 count
-------
     0
(1 row)

$ psql ... -c "select policyname, cmd from pg_policies where tablename='users';"
    policyname     |  cmd
-------------------+--------
 users_self_read   | SELECT
 users_self_update | UPDATE
(2 rows)
```

Zero rows — as expected before the first real `/start`.

## 5. Layer boundary — `packages/core` rejects `grammy`

Demonstration (2026-04-17 02:31):
```
$ echo "import 'grammy'; export const x = 1;" > packages/core/src/__layer_test.ts
$ pnpm --filter @ai-job-bot/core lint packages/core/src/__layer_test.ts
... "Found 1 error." (noRestrictedImports on "grammy")
$ rm packages/core/src/__layer_test.ts
```

`biome.json` override on `packages/core/**/*.ts` with `noRestrictedImports.paths` enumerates
the forbidden modules (`next`, `next/*`, `react`, `react-dom`, `@supabase/*`,
`@anthropic-ai/sdk`, `grammy`, `@tonconnect/*`, `@telegram-apps/*`). ADR 0003 ✅.

## 6. Auth flow smoke (unit + integration)

`apps/web/lib/telegram/verify-init-data.test.ts` (12 cases) proves:
- valid initData → parsed user object returned
- tampered hash → `InvalidInitDataSignatureError`
- `auth_date > maxAgeSeconds` → `StaleInitDataError`
- missing hash / auth_date → `MalformedInitDataError`
- unknown query params → ignored

`apps/web/lib/auth/jwt.test.ts` (5 cases) proves:
- `signSupabaseJwt({ sub })` produces a 15-minute HS256 JWT over `SUPABASE_JWT_SECRET`
- wrong secret → verification fails
- past `exp` → verification fails
- claims `{ sub, role: 'authenticated', iss: 'supabase' }` round-trip

`packages/core/src/application/upsert-user.test.ts` (7 cases) proves the use case via an
in-memory `FakeUserRepo`: create-on-first-see, idempotent on `telegram_id`, preserves `id`
across upserts, applies locale detection from `language_code`.

`apps/web/lib/supabase/user-repo.test.ts` (4 integration cases, auto-skip when Supabase
unreachable) proves round-trip through real RLS + service-role upsert.

End-to-end via `curl` with synthesised initData is **user-gated** (§9) because it needs a
live bot token + `pnpm dev` in one terminal.

## 7. Home greeting renders

Mini App greeting page: `apps/web/app/(app)/page.tsx`. Reads `useSession()` → extracts
`session.user.firstName ?? session.user.username ?? t('home.fallbackName')`, renders
`t('home.greeting', { name })` + `t('home.description')` + `t('home.phaseNote')`.

Verified via:
- Typecheck (imports from `@/components/ui/layout` + `@/lib/auth/use-session` resolve).
- Next build output marks `/` as dynamic (ƒ) server-rendered — expected because the
  layout uses `getLocale()`/`getMessages()` from `next-intl/server`.
- Messages-parity test confirms `home.fallbackName` + `home.phaseNote` exist in all 5
  locale files.

Real-device render is Wave K (§9).

## 8. Dev fixture `/ui-contract` renders all 8 primitives

`apps/web/app/(dev)/ui-contract/page.tsx` exercises each layout primitive under worst-case
content (RU-long, AI-token, 12-item HScroll rail, FieldGroup hint+error).

Verified:
- Typecheck + lint + build green with the fixture file included.
- `app/(dev)/layout.tsx` is intentionally bare (no providers) so future Playwright
  screenshots stay deterministic.
- Route is present in the Next build output as a static (○) prerendered page.

Playwright visual baseline is deferred; will run on the first PR after the user confirms
the greeting looks correct (the baselines should not be blessed before the real-device
render is visually approved).

## 9. User checkpoints (open)

These three tasks require Vadym's phone / BotFather / Vercel UI:

1. **BotFather `/setmenubutton`** — Set the Web App URL on @AiJobFatherBot to the Vercel
   production URL. This makes the `Open App` button appear in the chat header.
2. **`pnpm tsx scripts/set-webhook.ts`** — Run with
   `NEXT_PUBLIC_MINI_APP_URL=<vercel-prod-url>` in the env. Registers
   `${url}/api/bot/webhook` with Telegram + passes the webhook secret token.
3. **Real `/start` flow** — Open @AiJobFatherBot on a phone, send `/start`, tap
   `Open App`, confirm:
   - Bot reply appears in the expected locale (matching device's Telegram language).
   - Mini App greeting renders with correct `firstName`.
   - Supabase Studio → `public.users` shows a row with matching `telegram_id` + `locale`.
   - Screenshot all three and paste into §10 below.

Once §9.3 passes, Phase 1 closes.

## 10. Real-device evidence — 2026-04-17 08:03 UTC

User opened `@AiJobFatherBot` on device, tapped the BotFather-configured
menu-button pointing at `https://ai-job-father-web.vercel.app/`, and hit
`/start`. Observed:

- Bot replies in chat with `Welcome! Tap to open the app.` + inline
  `Open App` button (screenshot in session).
- Tapping `Open App` loads the Mini App WebView. Telegram's
  `telegram-web-app.js` runtime (added to root layout in commit
  `caaea1c`) populates `window.Telegram.WebApp.initData` before React
  hydration; AuthGate POSTs to `/api/auth/session`; `/(app)/page.tsx`
  renders the greeting.
- Mini App shows (RU locale auto-detected):
  `[RU] Hi, Vadym!` + `[RU] AI Job Bot helps you find the right role...`
  + `[RU] Phase 1 skeleton. Profile, campaign wizard and payments land
  in the next phases.` ([RU] prefix is intentional — real translations
  land in Phase 6 per D1.9).

Supabase Cloud write (verified 08:04 UTC via psql against pooler):

```
                  id                  | telegram_id |    username    | first_name |  last_name  | locale | is_premium |          created_at
--------------------------------------+-------------+----------------+------------+-------------+--------+------------+-------------------------------
 597cbe39-2607-4ef5-abc3-b5647b0ebe2b |   616247230 | melnychenkovad | Vadym      | Melnychenko | ru     | f          | 2026-04-17 08:03:55.980841+00
(1 row)
```

The single row proves the full pipeline:
`Open App → window.Telegram.WebApp.initData → HMAC verify
→ upsertUser → SupabaseUserRepo.upsert → RLS row → Supabase JWT
→ browser session → greeting render`.

Phase 1's observable outcome (`/start` → `users` row upserted + Mini App
greeting in locale) is confirmed end-to-end against production Vercel +
Supabase Cloud. Phase 1 closed.

Open user-gated follow-ups deferred into Phase 2+:
- Playwright visual baselines on `/` + `/ui-contract` (Wave H) — held
  until user signs off on greeting typography.
- Real UK/RU/IT/PL translations (Phase 6).
- `/status` command real data + notifications outbox (Phase 5).

## 11. Ritual checklist (R-15)

- [x] R-15.1 — code + tests green (typecheck + lint + build + unit).
- [x] R-15.2 — feature docs: `auth-skeleton.md`, `ui-contract.md`, `i18n-skeleton.md`,
      `bot-commands.md`.
- [x] R-15.3 — `docs/CHANGELOG.md` Phase 1 entry appended.
- [x] R-15.4 — `docs/PROJECT-MAP.md` v1.
- [x] R-15.5 — `docs/SESSION-LOG.md` 2026-04-17 entry appended.
- [x] R-15.6 — `CLAUDE.md` updated (§6/§7/§18/§19/§20).
- [x] R-15.7 — ADRs 0004 + 0005.
- [x] R-15.8 — Auto-memory notes saved (`feedback_git_identity.md`,
      `feedback_no_security_nagging.md`).
- [x] R-15.9 — this file.
- [x] R-15.10 — typecheck + build + lint green.

## 12. Artifacts + git state

```
$ git log --oneline -20 | head
41a7883 docs: update CLAUDE.md + STATE for Phase 1 shipped
390ab9c docs: append SESSION-LOG 2026-04-17 entry
c7cec8b docs: update PROJECT-MAP to v1
3600319 docs: append Phase 1 CHANGELOG entry
ec97a18 docs: Wave J feature docs + ADRs for Phase 1
d9ef7dc docs(planning): track Phase 1 PLAN.md + bump STATE
6ca0b7c feat(web): add dev-only /ui-contract visual-regression fixture
62ca222 feat(web): (app) route group with Mini App greeting home
e85d9b8 feat(web): add useSession hook reading cached session payload
6f4777a feat(web): compose TelegramProvider (query + theme + auth)
b57d89f feat(web): add AuthGate for initData → /api/auth/session → Supabase JWT
cb92e54 feat(web): add TanStack Query client factory
9094ac1 feat(web): add Telegram WebApp typed accessor + ThemeBridge
ed3fe95 chore(lint): exempt test files from strict style rules + apply biome autofixes
```

Total commits on `origin/main`: 87+ (Phase 0: 38; Phase 1 batch 1: 35; Phase 1 closure on
2026-04-17: 14). All pushed to `git@github.com:melnicenkovadik/Ai-Job-Father.git`.

## 13. Conclusion

Phase 1's code, tests, docs, and DB schema are shipped. The only gate to calling Phase 1
"done" is the real-device flow (§9) which requires:
1. User to set the Mini App URL in BotFather.
2. User or Claude to run `scripts/set-webhook.ts` against the Vercel prod URL.
3. User to run `/start` from a phone and screenshot the flow.

Claude is stopping here (autonomous night pass). Next morning the user performs §9.1-§9.3,
pastes screenshots into §10, and Phase 1 is formally complete.
