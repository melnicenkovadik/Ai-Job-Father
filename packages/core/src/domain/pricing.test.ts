import { describe, expect, it } from 'vitest';
import { JOB_CATEGORIES } from './job-category';
import {
  BASE_RATE_USD_CENTS_PER_APPLICATION,
  type Complexity,
  InvalidPricingInputError,
  priceCampaign,
} from './pricing';

const COMPLEXITIES: readonly Complexity[] = ['low', 'medium', 'high'];

describe('priceCampaign — happy path', () => {
  it('quota = 0 returns 0 regardless of category or complexity', () => {
    for (const category of JOB_CATEGORIES) {
      for (const complexity of COMPLEXITIES) {
        const r = priceCampaign({ category, quota: 0, complexity });
        expect(r.amountCents).toBe(0);
        expect(r.quota).toBe(0);
      }
    }
  });

  it('tech + medium + quota=10 produces base × 10 = 500 cents', () => {
    const r = priceCampaign({ category: 'tech', quota: 10, complexity: 'medium' });
    expect(r.amountCents).toBe(BASE_RATE_USD_CENTS_PER_APPLICATION * 10);
    expect(r.categoryMultiplier).toBe(1.0);
    expect(r.complexityMultiplier).toBe(1.0);
  });

  it('web3 + high + quota=100 applies 1.25 × 1.3 × 50 × 100 ≈ 8125 cents', () => {
    const r = priceCampaign({ category: 'web3', quota: 100, complexity: 'high' });
    expect(r.amountCents).toBe(Math.round(50 * 1.25 * 1.3 * 100));
  });
});

describe('priceCampaign — properties', () => {
  it('amount is monotonic non-decreasing in quota (fixed category + complexity)', () => {
    for (const category of JOB_CATEGORIES) {
      const quotas = [0, 1, 5, 10, 50, 100, 500];
      let last = -1;
      for (const quota of quotas) {
        const r = priceCampaign({ category, quota, complexity: 'medium' });
        expect(r.amountCents).toBeGreaterThanOrEqual(last);
        last = r.amountCents;
      }
    }
  });

  it('amount is linear in quota (within rounding tolerance)', () => {
    for (const category of JOB_CATEGORIES) {
      const one = priceCampaign({ category, quota: 1, complexity: 'medium' });
      const ten = priceCampaign({ category, quota: 10, complexity: 'medium' });
      expect(Math.abs(ten.amountCents - one.amountCents * 10)).toBeLessThanOrEqual(5);
    }
  });

  it('higher complexity monotonic on amount (same category, same quota)', () => {
    for (const category of JOB_CATEGORIES) {
      const low = priceCampaign({ category, quota: 50, complexity: 'low' });
      const med = priceCampaign({ category, quota: 50, complexity: 'medium' });
      const high = priceCampaign({ category, quota: 50, complexity: 'high' });
      expect(med.amountCents).toBeGreaterThan(low.amountCents);
      expect(high.amountCents).toBeGreaterThan(med.amountCents);
    }
  });

  it('amount is always a non-negative integer', () => {
    for (const category of JOB_CATEGORIES) {
      for (const complexity of COMPLEXITIES) {
        for (const quota of [0, 1, 7, 50, 100, 500]) {
          const r = priceCampaign({ category, quota, complexity });
          expect(Number.isInteger(r.amountCents)).toBe(true);
          expect(r.amountCents).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('breakdown fields match input', () => {
    const r = priceCampaign({ category: 'data', quota: 42, complexity: 'high' });
    expect(r.baseRateCents).toBe(BASE_RATE_USD_CENTS_PER_APPLICATION);
    expect(r.quota).toBe(42);
  });
});

describe('priceCampaign — validation', () => {
  it('rejects unknown category', () => {
    // Cast via unknown so we can exercise the runtime guard without TS refusal.
    expect(() =>
      priceCampaign({
        category: 'healthcare' as unknown as (typeof JOB_CATEGORIES)[number],
        quota: 10,
        complexity: 'medium',
      }),
    ).toThrow(InvalidPricingInputError);
  });

  it('rejects negative quota', () => {
    expect(() => priceCampaign({ category: 'tech', quota: -1, complexity: 'medium' })).toThrow(
      InvalidPricingInputError,
    );
  });

  it('rejects non-integer quota', () => {
    expect(() => priceCampaign({ category: 'tech', quota: 1.5, complexity: 'medium' })).toThrow(
      InvalidPricingInputError,
    );
  });

  it('rejects quota > 500', () => {
    expect(() => priceCampaign({ category: 'tech', quota: 501, complexity: 'medium' })).toThrow(
      InvalidPricingInputError,
    );
  });

  it('rejects unknown complexity', () => {
    expect(() =>
      priceCampaign({
        category: 'tech',
        quota: 10,
        complexity: 'extreme' as unknown as Complexity,
      }),
    ).toThrow(InvalidPricingInputError);
  });
});
