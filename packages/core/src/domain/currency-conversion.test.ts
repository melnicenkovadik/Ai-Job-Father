import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STARS_PER_USD_CENT,
  DEFAULT_USD_CENTS_PER_TON,
  InvalidRateError,
  usdCentsToStars,
  usdCentsToTonNano,
} from './currency-conversion';

describe('usdCentsToStars', () => {
  it('returns whole Stars (rounded up)', () => {
    expect(usdCentsToStars(1250, DEFAULT_STARS_PER_USD_CENT)).toBe(625);
    expect(usdCentsToStars(1, 0.5)).toBe(1); // 0.5 → ceil = 1
  });
  it('zero in → zero out', () => {
    expect(usdCentsToStars(0, 0.5)).toBe(0);
  });
  it('rejects non-positive rate', () => {
    expect(() => usdCentsToStars(100, 0)).toThrow(InvalidRateError);
    expect(() => usdCentsToStars(100, -1)).toThrow(InvalidRateError);
  });
  it('rejects negative amount', () => {
    expect(() => usdCentsToStars(-1, 0.5)).toThrow(InvalidRateError);
  });
});

describe('usdCentsToTonNano', () => {
  it('converts to nano-TON correctly', () => {
    expect(usdCentsToTonNano(250, DEFAULT_USD_CENTS_PER_TON)).toBe(1_000_000_000n);
    expect(usdCentsToTonNano(1250, 250)).toBe(5_000_000_000n);
    expect(usdCentsToTonNano(0, 250)).toBe(0n);
  });
  it('rejects non-positive rate', () => {
    expect(() => usdCentsToTonNano(100, 0)).toThrow(InvalidRateError);
  });
});
