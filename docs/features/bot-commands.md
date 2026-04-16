# Feature: Bot Commands (Telegram grammY)

**Phase:** 1
**Status:** Shipped 2026-04-17 (handlers + webhook; BotFather registration user-gated)
**Owner:** Claude (solo implementation)

## Purpose

Register the Mini App's conversational front door. Users enter the ecosystem through the bot
chat (`/start`), deep-link into specific Mini App routes (`/new`, `/profile`), glance at
campaign status without opening the app (`/status`), or find the command reference (`/help`).
Every command is a thin adapter that posts a text reply with an inline `Open App` button
pointing at a specific Mini App route.

## Commands

| Command | Handler | Mini App route | Phase 1 behaviour | Evolves in |
|---|---|---|---|---|
| `/start` | [apps/web/lib/telegram/bot.ts](../../apps/web/lib/telegram/bot.ts) | `/` | Greet user in their locale + `[Open App]` button | always live |
| `/new` | same | `/campaign/new/wizard` | `[Open App]` deep-link to wizard | Phase 3 wires the wizard |
| `/profile` | same | `/profile` | `[Open App]` to profile editor | Phase 2 wires profile UI |
| `/status` | same | `/` (dashboard route once Phase 5 lands) | Phase 1 replies with placeholder text; Phase 5 queries DB for last 3 campaigns + summarises | Phase 5 |
| `/help` | same | `/` | Static text listing commands + `[Open App]` | — |

Registered via `setMyCommands` on bot startup (covered by `setMyCommands` call in
`apps/web/lib/telegram/bot.ts`) so the client-side hint menu matches the server handlers.

## Transport

- **Webhook** at `/api/bot/webhook` (Node runtime — grammY requires Node, not Edge).
- grammY `webhookCallback(bot, 'std/http')` adapter handles the request.
- Header `X-Telegram-Bot-Api-Secret-Token` must match `TELEGRAM_WEBHOOK_SECRET_TOKEN` — else
  grammY returns 401 before any handler fires. Protects against anyone who learns the webhook
  URL from spoofing updates.
- `scripts/set-webhook.ts` registers the URL with Telegram's `setWebhook` API, passing
  `secret_token`. Idempotent — safe to re-run every time `ngrok` rotates a URL.

## Data Flow

```
User sends /start in @AiJobFatherBot
       │
       ▼
Telegram servers  ──POST ${MINI_APP_URL}/api/bot/webhook
                   + X-Telegram-Bot-Api-Secret-Token: <secret>
       │
       ▼
apps/web/app/api/bot/webhook/route.ts  (Node)
       │
       │  grammY webhookCallback → dispatches to bot.on('message:text') etc.
       ▼
apps/web/lib/telegram/bot.ts  (singleton)
       │
       │  /start handler:
       │    detect locale from ctx.from.language_code  →  pick t(...) via core/locale
       │    ctx.reply(greeting, {
       │      reply_markup: {
       │        inline_keyboard: [[{ text: t('home.cta.create_campaign'), web_app: { url: MINI_APP_URL } }]]
       │      }
       │    })
```

The bot handler does **not** write to Supabase. User row upsert happens when the WebView opens
and the client POSTs `initData` to `/api/auth/session`. Keeping the two flows decoupled means
the webhook is idempotent-by-design and can be replayed safely.

## Locale Handling

For bot-chat replies, locale comes from `ctx.from.language_code` (not from `users.locale`,
which is only set on first `/start` via the subsequent `/api/auth/session` call). Bot messages
lag real-time locale updates from Settings by one send — acceptable tradeoff for not round-
tripping to the DB on every message.

## Security

- Webhook secret (`TELEGRAM_WEBHOOK_SECRET_TOKEN`) verified on every inbound — enforces the
  request came from Telegram, not a random internet caller.
- Bot token (`TELEGRAM_BOT_TOKEN`) is server-only. Never exposed to the client. `lib/env.ts`
  keeps it out of `NEXT_PUBLIC_*`.
- Rate limiting per bot-user is deferred to Phase 7 (Sentry will surface spam first).

## Critical Files

- `apps/web/lib/telegram/bot.ts` — grammY Bot singleton + command handlers + `setMyCommands`.
- `apps/web/app/api/bot/webhook/route.ts` — HTTP endpoint.
- `scripts/set-webhook.ts` — one-shot webhook registration script.
- `apps/web/lib/env.ts` — `TELEGRAM_BOT_TOKEN` + `TELEGRAM_WEBHOOK_SECRET_TOKEN` validation.

## User-Gated Actions (carried over from Phase 1 blockers)

1. **BotFather `/newbot`** — creates @AiJobFatherBot, returns token. Token is already in env.
2. **BotFather `/setdomain`** — (optional) set domain for login widget; not needed for Mini App.
3. **BotFather `/setmenubutton`** — Bot Settings → Menu Button → set Web App URL to the Vercel
   prod URL. This makes the "Open App" button appear in the chat header.
4. **BotFather `/setcommands`** — paste the 5 command list so Telegram auto-suggests them.
   Handled by `setMyCommands` call on bot startup, but BotFather's UI version is faster for
   the first setup.
5. **Run `pnpm tsx scripts/set-webhook.ts`** with `NEXT_PUBLIC_MINI_APP_URL` pointing at prod.
   Registers the webhook URL + secret token with Telegram.

## Open Follow-ups

- **Phase 5**: `/status` replies with real last-3-campaigns summary pulled from Supabase
  (read-only role).
- **Phase 5**: `payment_succeeded` / `payment_failed` notifications — worker reads
  `notifications` outbox and sends `sendMessage` via the bot.
- **Phase 7**: rate limiting per user; Sentry transport on handler errors.
