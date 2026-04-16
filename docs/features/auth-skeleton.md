# Feature: Auth Skeleton (Telegram initData → Supabase JWT)

**Phase:** 1
**Status:** Shipped 2026-04-17
**Owner:** Claude (solo implementation)

## Purpose

Stand up the end-to-end authentication loop: a user taps the Mini App button in Telegram, the
WebView opens, the client POSTs raw `initData` to the server, the server HMAC-verifies the
signature, upserts a `users` row, signs a short-lived Supabase JWT, hands it back to the
browser, and from that point on every Supabase query from the Mini App passes RLS via
`auth.uid() = users.id`.

Telegram is the identity provider. We do not use Supabase Auth, passwords, OAuth, or email
verification. The HMAC over `initData` **is** our proof of identity on every session.

## Data Flow

```
Telegram app (iOS / Android / Desktop)
    │
    │  [Open App] button  →  launches WebView with
    │                         window.Telegram.WebApp.initData = "<signed string>"
    ▼
apps/web/app/(app)/layout.tsx  (RSC)
    │
    │  wraps children in:
    │    NextIntlClientProvider  →  TelegramProvider
    ▼
apps/web/components/telegram/provider.tsx  ('use client')
    │
    │  mounts QueryClientProvider + ThemeBridge + AuthGate
    ▼
apps/web/components/telegram/auth-gate.tsx  ('use client')
    │
    │  1. window.Telegram.WebApp.initData  →  state
    │  2. POST /api/auth/session  (Authorization: Tma <initData>)
    ▼
apps/web/app/api/auth/session/route.ts  (Node runtime)
    │
    │  resolveSession(rawInitData)
    ▼
apps/web/lib/telegram/session.ts  (server-only)
    │
    │  1. verifyInitData(rawInitData, botToken, maxAgeSeconds)
    │        ← HMAC-SHA256(dataCheckString, sha256("WebAppData" + BOT_TOKEN))
    │        ← throws on Stale | Invalid | Malformed
    │  2. upsertUser(...)  via SupabaseUserRepo
    │        ← service-role client, bypasses RLS on UPSERT
    │  3. signSupabaseJwt({ sub: users.id, role: 'authenticated' }, exp=15min)
    │        ← jose HS256 over SUPABASE_JWT_SECRET
    │
    ▼
Response: { jwt, expiresAt, user: { id, telegramId, locale, ... } }
    │
    ▼
apps/web/components/telegram/auth-gate.tsx
    │
    │  applySupabaseJwt(jwt)  →  supabase-js setSession({access_token: jwt, refresh_token: ''})
    │  queryClient.setQueryData(['session'], response)
    │
    ▼
apps/web/app/(app)/page.tsx  ('use client')
    │
    │  useSession() reads ['session'] from the cache
    │  → renders t('home.greeting', { name: session.user.firstName ?? fallbackName })
```

## Schema Deltas

Migration `20260418000000_users.sql`:
- `public.users (id uuid PK, telegram_id bigint UNIQUE, username, first_name, last_name,`
  `locale text NOT NULL default 'en', is_premium bool, timezone, created_at, updated_at)`
- Index `users_telegram_id_idx` on `(telegram_id)`.
- Trigger `users_updated_at` maintains `updated_at` on UPDATE via `set_updated_at()` function.

Migration `20260418000100_users_rls.sql`:
- `ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;`
- Policy `users_self_read` — `SELECT USING (id = auth.uid())`.
- Policy `users_self_update` — `UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid())`.
- No INSERT policy — service-role bypasses RLS (only the server mints rows).
- No DELETE policy — GDPR deletion goes through a dedicated RPC in Phase 7.

## Security Contract

1. **Raw `initData` only.** We never trust `window.Telegram.WebApp.initDataUnsafe` — that's an
   already-parsed object the client could mutate. Only the raw string carries the HMAC.
2. **HMAC key derivation.** `secretKey = HMAC_SHA256("WebAppData", BOT_TOKEN)` then
   `expectedHash = HMAC_SHA256(secretKey, dataCheckString)`. `dataCheckString` is the
   lexicographically-sorted `key=value` pairs joined by `\n`, excluding `hash`.
3. **Freshness window.** Default 24h (`maxAgeSeconds: 86400`). Payment endpoints in Phase 4
   will tighten to 1h (`maxAgeSeconds: 3600`) per R-2.3.
4. **JWT TTL.** 15 minutes. On 401 (expired JWT), the browser re-posts `initData` and gets a
   fresh JWT — cheap because the server already has the verified `users` row cached (one
   Supabase upsert per refresh, no re-parse).
5. **Webhook secret token.** `/api/bot/webhook` verifies the `X-Telegram-Bot-Api-Secret-Token`
   header matches `TELEGRAM_WEBHOOK_SECRET_TOKEN`. Different trust path from WebApp initData:
   bot updates come from Telegram servers, WebApp requests come from a user-owned browser.
6. **`server-only` guard.** Files that import `SUPABASE_SERVICE_ROLE_KEY` or
   `SUPABASE_JWT_SECRET` import `server-only` to refuse bundling into client chunks.

## UX States

`<AuthGate>` owns the Mini App's loading / error surface before children render:

| State | Trigger | What the user sees |
|---|---|---|
| bootstrap | before `window.Telegram` has been inspected | `t('auth.loading')` centered |
| missing | `window.Telegram.WebApp.initData` absent (e.g. direct Vercel URL) | `t('auth.error.missing_init_data')` |
| pending | session mutation in flight | `t('auth.loading')` |
| stale | server returned 401 `stale_init_data` | `t('auth.error.stale_init_data')` + `Retry` |
| invalid | server returned 403 `invalid_signature` | `t('auth.error.invalid_signature')` + `Retry` |
| malformed | server returned 400 `malformed_init_data` | `t('auth.error.malformed_init_data')` + `Retry` |
| generic | server returned 500 or network failed | `t('auth.error.generic')` + `Retry` |
| ready | session cached under `['session']` query key | children render |

## Edge Cases

- **Out-of-Telegram open (direct Vercel URL).** `getWebApp()` returns `undefined`, gate renders
  `missing_init_data` message. Nothing else is attempted — no network call, no state.
- **Expired `initData`.** Server throws `StaleInitDataError` → 401. Client keeps the raw string
  in state; tapping Retry re-POSTs. Usually the user has just been reopening an old WebView —
  quitting the Mini App and re-opening regenerates `initData` via Telegram.
- **Locale auto-detection.** `detectLocale(initData.user.language_code)` lowercases, strips
  region (`en-us` → `en`), returns fallback `en` for unsupported codes. Covered by
  `packages/core/src/domain/locale.test.ts`.
- **JWT expiry mid-session.** Browser client hits 401; re-auth handler (to be added in Phase 5
  dashboard) re-POSTs `initData` silently. For Phase 1 the `Retry` button is the manual path.
- **Multi-tab.** `getBrowserClient()` caches the Supabase client per module; each tab has its
  own module instance. Two tabs = two independent sessions; both get valid JWTs. Not a
  collision issue (RLS keys on `users.id`).
- **iOS Safari's keyboard viewport shift.** `ThemeBridge` binds `--tg-viewport-height` to
  `Telegram.WebApp.viewportHeight`, which fires `viewportChanged` when the keyboard opens;
  layout primitives read that var, so forms don't jump behind the MainButton.

## Dev Loop (ngrok / Cloudflare Tunnel)

Telegram requires HTTPS for the WebView URL. Local dev paths:

1. **ngrok (default).** `brew install ngrok`. In one terminal run `pnpm dev`, in another
   `ngrok http 3000`. Copy the `https://*.ngrok-free.app` URL into both:
   - `NEXT_PUBLIC_MINI_APP_URL` in `.env.local`
   - BotFather `/setmenubutton` for @AiJobFatherBot
   Then run `pnpm tsx scripts/set-webhook.ts` to register the webhook. **ngrok free rotates the
   subdomain every session — every time `pnpm dev` restarts, re-run `ngrok http 3000` and
   `pnpm tsx scripts/set-webhook.ts`.**
2. **Cloudflare Tunnel (stable URL option B).** `brew install cloudflared`;
   `cloudflared tunnel --url http://localhost:3000`. Free tier with a stable hostname when
   linked to a Cloudflare account.
3. **Vercel preview (pre-production).** Push a branch → Vercel preview URL. Each PR gets its
   own URL — re-run `set-webhook` per PR if the bot needs to work against that preview.

## Related ADRs

- [0001 — Next.js as bot host](../DECISIONS/0001-nextjs-as-bot-host.md) — one deployment for
  Mini App + bot webhook.
- [0002 — Supabase as shared DB](../DECISIONS/0002-supabase-as-shared-db.md) — service-role
  writes, RLS reads.
- [0003 — Clean Architecture layers](../DECISIONS/0003-clean-architecture-layers.md) —
  `packages/core` holds `User` entity + `upsertUser` use case + `UserRepo` port.
- [0004 — Telegram initData auth](../DECISIONS/0004-telegram-initdata-auth.md) — why HMAC over
  OIDC / Supabase Auth / session cookies.

## Critical Files

- `packages/core/src/domain/user.ts` — `User` entity, `TelegramId` / `UserId` value objects.
- `packages/core/src/domain/locale.ts` — `Locale` type, `detectLocale`, `SUPPORTED_LOCALES`.
- `packages/core/src/application/upsert-user.ts` — use case + `UserRepo` port.
- `apps/web/lib/telegram/verify-init-data.ts` — HMAC verification.
- `apps/web/lib/telegram/session.ts` — `resolveSession(raw)` orchestrator.
- `apps/web/lib/auth/jwt.ts` — `signSupabaseJwt` via `jose`.
- `apps/web/lib/supabase/server.ts` — service-role client, `server-only`.
- `apps/web/lib/supabase/browser.ts` — browser client + `applySupabaseJwt`.
- `apps/web/lib/supabase/user-repo.ts` — `SupabaseUserRepo` adapter.
- `apps/web/app/api/auth/session/route.ts` — HTTP endpoint.
- `apps/web/components/telegram/webapp.ts` — typed WebApp global.
- `apps/web/components/telegram/auth-gate.tsx` — client mutation + render gate.
- `apps/web/components/telegram/provider.tsx` — composes providers.
- `apps/web/lib/auth/use-session.ts` — read hook.
- `apps/web/app/(app)/layout.tsx` — route-group shell.
- `apps/web/app/(app)/page.tsx` — greeting home.
- `packages/db/supabase/migrations/20260418000000_users.sql` — table.
- `packages/db/supabase/migrations/20260418000100_users_rls.sql` — policies.
- `scripts/set-webhook.ts` — one-shot webhook registration.

## Test Coverage

- `packages/core/src/domain/user.test.ts` — 12 tests, `User.rehydrate` valid + invalid cases.
- `packages/core/src/domain/locale.test.ts` — 19 tests covering detect + parity.
- `packages/core/src/application/upsert-user.test.ts` — 7 tests against an in-memory `UserRepo`.
- `apps/web/lib/telegram/verify-init-data.test.ts` — 12 tests: valid, stale, invalid-signature,
  malformed, missing-hash, missing-auth_date.
- `apps/web/lib/auth/jwt.test.ts` — 5 tests: sign, verify, expired, wrong secret, claims.
- `apps/web/lib/supabase/user-repo.test.ts` — 4 integration tests (auto-skip if Supabase
  unreachable).
- `apps/web/messages/messages-parity.test.ts` — 2 tests proving all 5 locale files share keys.

Total: **62 passing tests** across the workspace at Phase 1 end.

## Open Follow-ups

- Silent re-auth on 401 from random Supabase queries (Phase 5 dashboard surface).
- Per-user rate limit on `/api/auth/session` (Phase 7 hardening).
- Telegram Desktop initData quirks — needs real-device testing (T1.65 checkpoint).
- `ngrok` URL rotation pattern → document in RUNBOOK (Phase 7).
