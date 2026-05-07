import * as Sentry from '@sentry/nextjs';

/**
 * Sentry client (browser) initialization.
 *
 * `NEXT_PUBLIC_SENTRY_DSN` is the toggle: missing/empty → `init` is a
 * no-op and the SDK runs but never sends. Lets dev/preview deploys skip
 * Sentry entirely without code changes.
 *
 * `tracesSampleRate: 0` — performance tracing is off in v1; we only
 * want the error feed. Bump later when the project actually inspects
 * traces.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  tracesSampleRate: 0,
  // Privacy: PII off by default. The Mini App passes initData server-side
  // for auth; the client doesn't need to ship user identifiers to Sentry.
  sendDefaultPii: false,
  environment: process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NODE_ENV ?? 'development',
});
