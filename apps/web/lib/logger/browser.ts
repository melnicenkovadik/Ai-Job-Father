'use client';

import { env } from '../env';
import { ConsoleTransport } from './console-transport';
import { CoreLogger } from './core';
import { HttpBatchedTransport } from './http-transport';
import { NullTransport } from './null-transport';
import type { LogContext, LogLevel, LogTransport, Logger } from './types';

const DISABLED = ['false', '0', 'off', 'no'];

function isEnabled(): boolean {
  const raw = env.NEXT_PUBLIC_LOG_ENABLED?.toLowerCase().trim();
  return raw === undefined || raw === '' || !DISABLED.includes(raw);
}

let cached: Logger | null = null;
let bound: LogContext = {};
let listenersAttached = false;

function buildBrowserLogger(): Logger {
  if (!isEnabled()) {
    return new CoreLogger({
      source: 'web',
      level: 'error',
      transports: [new NullTransport()],
    });
  }
  const transports: LogTransport[] = [new ConsoleTransport(), new HttpBatchedTransport()];
  return new CoreLogger({
    source: 'web',
    level: env.NEXT_PUBLIC_LOG_LEVEL as LogLevel,
    transports,
    contextResolver: () => ({
      ...bound,
      url: typeof window !== 'undefined' ? window.location.pathname : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    }),
  });
}

/**
 * Browser logger singleton. Reads {@link env.NEXT_PUBLIC_LOG_ENABLED} once
 * on first call; restart the app to pick up a changed value.
 */
export function getBrowserLogger(): Logger {
  if (cached) return cached;
  cached = buildBrowserLogger();
  return cached;
}

/**
 * Bind ambient identity to every subsequent log event from the browser.
 * Called by `<AuthGate>` once `/api/auth/session` returns the user payload.
 */
export function bindLogContext(ctx: LogContext): void {
  bound = { ...bound, ...ctx };
}

/**
 * Hook `window.error` and `window.unhandledrejection` once. Idempotent —
 * safe to call from multiple components.
 */
export function attachGlobalErrorListeners(): void {
  if (listenersAttached || typeof window === 'undefined') return;
  listenersAttached = true;
  const log = getBrowserLogger();
  window.addEventListener('error', (event) => {
    log.error({
      context: 'window.error',
      message: event.message,
      data: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
      error: event.error,
    });
  });
  window.addEventListener('unhandledrejection', (event) => {
    log.error({
      context: 'window.unhandledrejection',
      message: 'unhandled promise rejection',
      error: event.reason,
    });
  });
}
