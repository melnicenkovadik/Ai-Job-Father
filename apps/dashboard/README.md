# AI Job Father · Dashboard

Operator-side admin panel for the AI Job Bot Telegram Mini App. Read/write access to every
entity in the system via Supabase service-role.

## Local dev

```bash
cp apps/dashboard/.env.example apps/dashboard/.env.local
# fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DASHBOARD_USER, DASHBOARD_PASSWORD

pnpm install
pnpm --filter @ai-job-bot/dashboard dev   # → http://localhost:3001
```

Browser will prompt for HTTP Basic credentials. Use `DASHBOARD_USER` / `DASHBOARD_PASSWORD`.

## Deploy

Separate Vercel project (`ai-job-bot-dashboard`). Settings:

- **Framework**: Next.js (auto-detected).
- **Root Directory**: `apps/dashboard`.
- **Install Command**: `pnpm install` (run from repo root by Vercel).
- **Build Command**: `pnpm --filter @ai-job-bot/dashboard build`.
- **Output Directory**: `apps/dashboard/.next` (auto).

Copy these env vars from the Mini App Vercel project:
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_BOT_TOKEN`, `TON_NETWORK`, `STARS_TEST_MODE`, `STARS_TEST_AMOUNT`.

Add new ones:
`DASHBOARD_USER`, `DASHBOARD_PASSWORD`.

## Stack

- Next.js 15 (App Router) + React 19
- Tailwind CSS v4
- Supabase service-role (bypasses RLS)
- HTTP Basic Auth via middleware
- Server Actions for mutations
- All admin actions logged to `app_logs` with `context = 'admin/<action>'`
