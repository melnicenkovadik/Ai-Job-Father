import * as Sentry from '@sentry/nextjs';

/**
 * Sentry edge runtime initialization (middleware + edge route handlers).
 * Mirrors the server config — same DSN, same env. We don't actively use
 * the edge runtime today, but Next.js wires this in via instrumentation
 * regardless.
 */
const dsn = process.env.SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  tracesSampleRate: 0,
  sendDefaultPii: false,
  environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? 'development',
});
