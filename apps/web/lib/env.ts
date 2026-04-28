import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    // Phase 1 — Supabase
    SUPABASE_URL: z.string().url(),
    SUPABASE_ANON_KEY: z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    SUPABASE_JWT_SECRET: z.string().min(1),
    // Phase 1 — Telegram. Optional so Vercel preview builds succeed before the user
    // adds Bot credentials via Project Settings → Environment Variables. At runtime,
    // consumers throw a helpful error if the vars are missing.
    TELEGRAM_BOT_TOKEN: z.string().min(1).optional(),
    TELEGRAM_WEBHOOK_SECRET_TOKEN: z.string().min(1).optional(),
    // Phase 2 — AI resume parse (OpenAI gpt-5.1 per ADR 0006; Anthropic vars kept
    // optional for potential future fallback / alt-provider use cases).
    OPENAI_API_KEY: z.string().optional(),
    OPENAI_RESUME_MODEL: z.string().default('gpt-5.1'),
    ANTHROPIC_API_KEY: z.string().optional(),
    ANTHROPIC_MODEL: z.string().default('claude-sonnet-4-5'),
    // Phase 3 — ESCO
    ESCO_API_BASE: z.string().url().default('https://ec.europa.eu/esco/api'),
    // Phase 4 — TON. Wave E uses TON_NETWORK to pick TonAPI host
    // (testnet → testnet.tonapi.io, mainnet → tonapi.io). TON_API_KEY is
    // optional — TonAPI works on the free tier without a key but rate-limits
    // hard. TON_PAYMENT_RECIPIENT_ADDRESS receives the user's TON; required
    // at runtime when /api/payments/init is hit with provider=ton.
    TON_API_KEY: z.string().optional(),
    TON_NETWORK: z.enum(['testnet', 'mainnet']).default('testnet'),
    TON_MANIFEST_URL: z.string().url().optional(),
    TON_PAYMENT_RECIPIENT_ADDRESS: z.string().optional(),
    // Phase 7 — Observability
    SENTRY_DSN: z.string().optional(),
    SENTRY_AUTH_TOKEN: z.string().optional(),
    // Test-mode override for Stars invoices. When set to a positive integer,
    // /api/payments/init and the bot's pre_checkout_query both use this Stars
    // amount instead of the canonical priceCampaign-derived figure. Use for
    // single-Star verification runs without paying full price; unset in normal
    // production to fall back to the real conversion.
    STARS_TEST_AMOUNT: z.coerce.number().int().positive().optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
    // Optional for the same reason as TELEGRAM_BOT_TOKEN above — unblock Vercel builds
    // before the user has finalized the production URL. Consumers fall back sensibly.
    NEXT_PUBLIC_MINI_APP_URL: z.string().url().optional(),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
    NEXT_PUBLIC_TONCONNECT_MANIFEST_URL: z.string().url().optional(),
    // Central app logger toggle. Default ON; set to "false" / "0" to silence
    // both the console transport and the network transport that POSTs to
    // /api/logs.
    NEXT_PUBLIC_LOG_ENABLED: z.string().optional(),
    NEXT_PUBLIC_LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET,
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    TELEGRAM_WEBHOOK_SECRET_TOKEN: process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_RESUME_MODEL: process.env.OPENAI_RESUME_MODEL,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL,
    ESCO_API_BASE: process.env.ESCO_API_BASE,
    TON_API_KEY: process.env.TON_API_KEY,
    TON_NETWORK: process.env.TON_NETWORK,
    TON_MANIFEST_URL: process.env.TON_MANIFEST_URL,
    TON_PAYMENT_RECIPIENT_ADDRESS: process.env.TON_PAYMENT_RECIPIENT_ADDRESS,
    SENTRY_DSN: process.env.SENTRY_DSN,
    SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
    STARS_TEST_AMOUNT: process.env.STARS_TEST_AMOUNT,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_MINI_APP_URL: process.env.NEXT_PUBLIC_MINI_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_TONCONNECT_MANIFEST_URL: process.env.NEXT_PUBLIC_TONCONNECT_MANIFEST_URL,
    NEXT_PUBLIC_LOG_ENABLED: process.env.NEXT_PUBLIC_LOG_ENABLED,
    NEXT_PUBLIC_LOG_LEVEL: process.env.NEXT_PUBLIC_LOG_LEVEL,
  },
  emptyStringAsUndefined: true,
  skipValidation: process.env.SKIP_ENV_VALIDATION === '1',
});
