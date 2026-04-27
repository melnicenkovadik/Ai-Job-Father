import type { LogTransport } from './types';

/** No-op transport used when logging is disabled via env. */
export class NullTransport implements LogTransport {
  send(): void {
    // intentionally empty
  }
}
