import {
  type LogEvent,
  type LogInput,
  type LogLevel,
  type LogSource,
  type LogTransport,
  type Logger,
  normalizeError,
  shouldEmit,
} from './types';

interface CoreLoggerOptions {
  source: LogSource;
  level: LogLevel;
  transports: LogTransport[];
  contextResolver?: () => Partial<Pick<LogEvent, 'userId' | 'telegramId' | 'url' | 'userAgent'>>;
}

/**
 * Composable logger that fans an event out to every configured transport.
 * Synchronous from the caller's POV — transports may queue/flush internally
 * (see {@link HttpBatchedTransport}).
 */
export class CoreLogger implements Logger {
  constructor(private readonly opts: CoreLoggerOptions) {}

  debug(input: LogInput): void {
    this.write('debug', input);
  }
  info(input: LogInput): void {
    this.write('info', input);
  }
  warn(input: LogInput): void {
    this.write('warn', input);
  }
  error(input: LogInput): void {
    this.write('error', input);
  }

  emit(event: LogEvent): void {
    for (const t of this.opts.transports) {
      try {
        const result = t.send(event);
        if (result instanceof Promise) {
          result.catch(() => {
            // a transport must never break the caller
          });
        }
      } catch {
        // a transport must never break the caller
      }
    }
  }

  private write(level: LogLevel, input: LogInput): void {
    if (!shouldEmit(level, this.opts.level)) return;
    const ctx = this.opts.contextResolver ? this.opts.contextResolver() : {};
    const event: LogEvent = {
      level,
      source: this.opts.source,
      context: input.context,
      message: input.message ?? input.context,
      data: input.data,
      error: normalizeError(input.error),
      timestamp: new Date().toISOString(),
      ...ctx,
    };
    this.emit(event);
  }
}
