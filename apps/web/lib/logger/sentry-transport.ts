import 'server-only';
import * as Sentry from '@sentry/nextjs';
import type { LogEvent, LogTransport } from './types';

/**
 * Forward `error`-level log events to Sentry.
 *
 * The CoreLogger already filters by level, so we only see what's
 * been allowed through. We additionally early-exit on non-error
 * events so a future config change to the global level doesn't
 * accidentally page the on-call from `info` logs.
 *
 * Sentry's `init` is called from `sentry.server.config.ts` via the
 * Next.js instrumentation hook — by the time the transport runs the
 * SDK is configured (or no-op if DSN is missing).
 */
export class SentryTransport implements LogTransport {
  send(event: LogEvent): void {
    if (event.level !== 'error') return;
    const tags: Record<string, string> = { context: event.context, source: event.source };
    if (event.url) tags.url = event.url;
    const extra: Record<string, unknown> = {};
    if (event.data) extra.data = event.data;
    if (event.message) extra.message = event.message;
    if (event.userId) extra.userId = event.userId;
    if (event.telegramId) extra.telegramId = event.telegramId;

    if (event.error) {
      const err = new Error(event.error.message);
      err.name = event.error.name;
      if (event.error.stack) err.stack = event.error.stack;
      Sentry.captureException(err, {
        tags,
        extra,
      });
      return;
    }
    Sentry.captureMessage(event.message || event.context, {
      level: 'error',
      tags,
      extra,
    });
  }
}
