import type { LogEvent, LogTransport } from './types';

/**
 * Plain `console.*` transport. Visible in browser DevTools and in Vercel
 * function stdout. Always safe to keep on — it has no side effects.
 */
export class ConsoleTransport implements LogTransport {
  send(event: LogEvent): void {
    const tag = `[${event.source}/${event.context}]`;
    const payload: Record<string, unknown> = {
      ...event,
      message: undefined,
      context: undefined,
      source: undefined,
    };
    if (event.level === 'error') {
      console.error(tag, event.message, payload);
    } else if (event.level === 'warn') {
      console.warn(tag, event.message, payload);
    } else if (event.level === 'debug') {
      console.debug(tag, event.message, payload);
    } else {
      console.info(tag, event.message, payload);
    }
  }
}
