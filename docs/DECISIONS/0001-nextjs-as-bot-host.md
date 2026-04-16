# ADR 0001 — Next.js hosts bot webhook + Mini App

**Status:** Accepted (2026-04-16)

## Context

The product needs to host two things:
1. A Telegram bot webhook (HTTP endpoint receiving `POST` updates from Telegram servers).
2. A Telegram Mini App (React SPA rendered inside Telegram's in-app WebView).

Both share: user identity (Telegram initData), Supabase data, the same payment rails, and the
same types for campaigns/profiles/notifications.

Splitting bot and app across two services forces extra IPC, type-sync discipline, and duplicated
auth logic. The product is small enough (solo dev, MVP) that a single deployment is the right
answer for now.

## Decision

One Next.js 15 App Router application on Vercel hosts both:
- **Bot webhook** at `apps/web/app/api/bot/webhook/route.ts` (Node runtime, grammY handler).
- **Mini App** under `apps/web/app/(app)/...` (RSC default, `'use client'` where needed).

grammY is chosen over alternatives because it has the best TypeScript support and ships with a
Next.js webhook adapter. Node runtime is required — grammY depends on `Buffer`, `crypto`, and
other Node APIs that Edge runtime doesn't provide.

## Consequences

**Positive:**
- Shared types across bot and Mini App (imports from `packages/core`).
- Single auth implementation (Telegram initData HMAC on Mini App side; webhook secret header on
  bot side — different trust paths, same codebase).
- Single Supabase client config.
- One deploy pipeline.

**Negative:**
- Bot downtime = Mini App downtime. Mitigated by Vercel serverless per-route scaling and edge
  caching for RSC.
- Cold start on bot webhook could delay message processing. Mitigated by keeping the webhook
  route dependency-light.

## Alternatives Considered

1. **Separate Node bot server on Fly.io / Railway.** Rejected: adds ops overhead, forces a
   shared types package via npm publish or a monorepo anyway, doesn't solve the auth-sync problem
   neatly.

2. **Cloudflare Workers for the bot.** Rejected: grammY has Node-compat issues on Workers;
   `Buffer` and crypto APIs differ; debugging is harder.

3. **Telegram Bot API long polling (no webhook).** Rejected: requires a long-running Node process
   with connection state; incompatible with serverless economics.
