/**
 * Clock port — use-case-injected time source.
 * `SystemClock` is the default adapter; tests use `FixedClock` (see test/fakes).
 */

export interface Clock {
  now(): Date;
}

export const SystemClock: Clock = {
  now: () => new Date(),
};
