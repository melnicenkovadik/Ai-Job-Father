# 0004 — Telegram initData as the authentication primitive

**Status:** Accepted 2026-04-17
**Supersedes:** none
**Deciders:** Vadym Melnychenko, Claude

## Context

The Mini App needs an authentication primitive. Options considered:

1. **Supabase Auth with Telegram as an OIDC / OAuth provider.** Supabase doesn't ship a native
   Telegram provider — it would require a custom bridge (Auth.js with a Telegram adapter,
   hosted signing server, redirect dance). The redirect flow adds UX friction inside a
   WebView and doesn't play well with Telegram's in-app browser.
2. **Anonymous + client-generated user id.** Trivial to spoof; no way to rate-limit or cut off
   abusive accounts. Not viable.
3. **Session cookie minted by our server after a one-time Telegram sign-in.** Works but
   reintroduces cookie management (HttpOnly, SameSite, rotation). Telegram already signs
   `initData` on every Mini App open — we'd be re-implementing a weaker primitive.
4. **Custom path: HMAC-verify Telegram's `initData`, upsert a `users` row, mint a short-lived
   Supabase JWT with `sub = users.id`.** Telegram is the IdP; Supabase is the RLS enforcer.

## Decision

We adopt option 4.

- Every request that needs identity carries raw `initData` in an `Authorization: Tma <string>`
  header.
- Server HMAC-verifies with `secretKey = HMAC_SHA256("WebAppData", BOT_TOKEN)`, enforces
  freshness (default 24h, payment endpoints will tighten to 1h), upserts the user, and signs a
  15-minute Supabase JWT (`jose` HS256) with `sub = users.id`, `role = 'authenticated'`.
- Browser applies the JWT via `supabase-js` `setSession`; all subsequent DB calls pass RLS
  keyed on `auth.uid() = users.id`.
- On JWT expiry (401) the browser silently re-posts `initData` to refresh.

## Consequences

**Positive.**
- No passwords, no OAuth redirects, no email verification.
- RLS is the single authorisation story — every table gets a `user_id = auth.uid()` policy and
  we're done.
- The security perimeter is exactly one function (`verifyInitData`) plus one env var
  (`TELEGRAM_BOT_TOKEN`). Auditable.
- Downstream workers (`job-hunter` evolution) get a dedicated Postgres role with narrow
  grants on the view — they never need to mint JWTs.

**Negative.**
- Telegram is the only entry point. A future web or mobile app would require a second auth
  path. Acceptable — MVP is Telegram-only.
- If Telegram rotates its signing scheme, we adapt. The HMAC formula has been stable since
  Mini Apps launched; monitoring risk low.
- `verifyInitData` must be kept airtight — a single forgery bypass = full user impersonation.
  Mitigated by aggressive test coverage (12 cases in
  `apps/web/lib/telegram/verify-init-data.test.ts`) including tampered hash, stale auth_date,
  malformed payloads, missing fields.

## Implementation Anchors

- Verifier: `apps/web/lib/telegram/verify-init-data.ts`
- Session orchestrator: `apps/web/lib/telegram/session.ts`
- JWT signer: `apps/web/lib/auth/jwt.ts`
- HTTP endpoint: `apps/web/app/api/auth/session/route.ts`
- Client gate: `apps/web/components/telegram/auth-gate.tsx`
- Server-only guards: `apps/web/lib/supabase/server.ts` (and every file importing
  `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_JWT_SECRET`)

## Alternatives Revisited

If a future phase needs a non-Telegram entry point, the rewrite path is:
1. Keep the `users` table keyed on `id`.
2. Add an optional `email` + `email_verified` column.
3. Layer Auth.js (or Supabase Auth proper) on top, minting the **same** JWT shape — Supabase
   queries don't care about the issuer, only that the JWT validates against
   `SUPABASE_JWT_SECRET`.

The investment in RLS policies keyed on `auth.uid()` is not thrown away.

## Related

- Feature doc: [auth-skeleton](../features/auth-skeleton.md)
- Prior ADRs: [0001](./0001-nextjs-as-bot-host.md), [0002](./0002-supabase-as-shared-db.md),
  [0003](./0003-clean-architecture-layers.md)
