/**
 * Central logger contract. Both the browser and the Node.js server side
 * implement this — transports vary, the shape doesn't.
 */

export const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export const LOG_SOURCES = ['web', 'bot', 'api'] as const;
export type LogSource = (typeof LOG_SOURCES)[number];

export interface LogContext {
  /** A user id from public.users when available; otherwise undefined. */
  userId?: string | undefined;
  /** Telegram user id when available, even before the users row exists. */
  telegramId?: number | undefined;
  /** Current URL path (browser) or route path (server). */
  url?: string | undefined;
  /** Browser UA / server runtime tag. */
  userAgent?: string | undefined;
}

export interface LogEvent extends LogContext {
  level: LogLevel;
  source: LogSource;
  /** Logical scope — e.g. "auth-gate", "api/auth/session". */
  context: string;
  message: string;
  data?: Record<string, unknown> | undefined;
  error?: { name: string; message: string; stack?: string | undefined } | undefined;
  /** ISO 8601 — defaults to "now" when omitted. */
  timestamp?: string | undefined;
}

export interface LogInput {
  context: string;
  message?: string | undefined;
  data?: Record<string, unknown> | undefined;
  error?: unknown;
}

export interface Logger {
  debug(input: LogInput): void;
  info(input: LogInput): void;
  warn(input: LogInput): void;
  error(input: LogInput): void;
  /** Bypasses level filtering — used by transports composing other transports. */
  emit(event: LogEvent): void;
}

export interface LogTransport {
  send(event: LogEvent): void | Promise<void>;
}

export const LOG_LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export function shouldEmit(eventLevel: LogLevel, minLevel: LogLevel): boolean {
  return LOG_LEVEL_RANK[eventLevel] >= LOG_LEVEL_RANK[minLevel];
}

export function normalizeError(err: unknown): LogEvent['error'] {
  if (err === undefined || err === null) return undefined;
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
    };
  }
  return { name: 'NonError', message: String(err) };
}
