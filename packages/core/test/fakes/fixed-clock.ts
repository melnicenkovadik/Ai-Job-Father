import type { Clock } from '../../src/application/ports/clock';

/**
 * Clock test double — deterministic `now()` plus a `tick(ms)` mutator.
 */
export class FixedClock implements Clock {
  private current: Date;

  constructor(initial: Date | string = '2026-04-16T12:00:00.000Z') {
    this.current = typeof initial === 'string' ? new Date(initial) : new Date(initial.getTime());
  }

  now(): Date {
    return new Date(this.current.getTime());
  }

  tick(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }

  set(date: Date | string): void {
    this.current = typeof date === 'string' ? new Date(date) : new Date(date.getTime());
  }
}
