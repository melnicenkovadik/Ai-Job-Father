import 'server-only';
import { env } from '../env';
import { ConsoleTransport } from './console-transport';
import { CoreLogger } from './core';
import { NullTransport } from './null-transport';
import { SupabaseTransport } from './supabase-transport';
import type { LogLevel, LogTransport, Logger } from './types';

const DISABLED = ['false', '0', 'off', 'no'];

function isEnabled(): boolean {
  // Server uses the same toggle as the browser — the env loader exposes it
  // because it carries the NEXT_PUBLIC_ prefix.
  const raw = env.NEXT_PUBLIC_LOG_ENABLED?.toLowerCase().trim();
  return raw === undefined || raw === '' || !DISABLED.includes(raw);
}

let cached: Logger | null = null;

/**
 * Server-side logger singleton — used by route handlers, server actions,
 * and any code paths that import `server-only`. Writes to console plus
 * `app_logs` (service role).
 */
export function getServerLogger(): Logger {
  if (cached) return cached;
  if (!isEnabled()) {
    cached = new CoreLogger({
      source: 'api',
      level: 'error',
      transports: [new NullTransport()],
    });
    return cached;
  }
  const transports: LogTransport[] = [new ConsoleTransport(), new SupabaseTransport()];
  cached = new CoreLogger({
    source: 'api',
    level: env.NEXT_PUBLIC_LOG_LEVEL as LogLevel,
    transports,
  });
  return cached;
}
