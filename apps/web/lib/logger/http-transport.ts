import type { LogEvent, LogTransport } from './types';

/**
 * Browser → server batched transport. Buffers events for ~`flushIntervalMs`
 * (or until `maxBatch` is reached) and POSTs them to `/api/logs`. Failures
 * never throw — losing logs must never break the foreground UX.
 */
export class HttpBatchedTransport implements LogTransport {
  private readonly endpoint: string;
  private readonly flushIntervalMs: number;
  private readonly maxBatch: number;
  private queue: LogEvent[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(opts?: { endpoint?: string; flushIntervalMs?: number; maxBatch?: number }) {
    this.endpoint = opts?.endpoint ?? '/api/logs';
    this.flushIntervalMs = opts?.flushIntervalMs ?? 1500;
    this.maxBatch = opts?.maxBatch ?? 20;
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flush(true);
      });
    }
  }

  send(event: LogEvent): void {
    this.queue.push(event);
    if (this.queue.length >= this.maxBatch) {
      this.flush(false);
      return;
    }
    if (this.flushTimer === null) {
      this.flushTimer = setTimeout(() => this.flush(false), this.flushIntervalMs);
    }
  }

  private flush(useBeacon: boolean): void {
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.queue.length === 0) return;
    const payload = JSON.stringify({ events: this.queue });
    this.queue = [];
    if (useBeacon && typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
      try {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(this.endpoint, blob);
        return;
      } catch {
        // fall through to fetch
      }
    }
    void fetch(this.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {
      // Drop on failure — DO NOT recurse into the logger from here, that's
      // an infinite loop trap.
    });
  }
}
