import * as Sentry from '@sentry/nextjs';

/**
 * Sentry server (Node) initialization. Picks up errors thrown from route
 * handlers, server actions, and middleware running on the Node runtime.
 */
const dsn = process.env.SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  tracesSampleRate: 0,
  sendDefaultPii: false,
  environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? 'development',
});
