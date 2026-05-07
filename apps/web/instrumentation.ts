/**
 * Next.js instrumentation hook — required by `@sentry/nextjs` ≥ 8.
 *
 * Loads the right Sentry config per runtime so server/edge errors land
 * in Sentry without us threading `init` through each route handler.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

// Re-export Sentry's request-error hook so unhandled errors in server
// components get captured. `@sentry/nextjs` exposes this since v8.
export { captureRequestError as onRequestError } from '@sentry/nextjs';
