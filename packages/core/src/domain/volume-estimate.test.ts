import { describe, expect, it } from 'vitest';
import { JOB_CATEGORIES, type JobCategory } from './job-category';
import {
  InvalidVolumeInputError,
  type VolumeEstimateInput,
  estimateVolume,
} from './volume-estimate';

const base: VolumeEstimateInput = {
  category: 'tech',
  countries: ['US', 'GB', 'DE'],
  seniority: ['senior'],
  workModes: ['remote'],
  stackSize: 3,
  minSalaryUsd: 6000,
  maxPostingAgeDays: 30,
};

describe('estimateVolume — happy path', () => {
  it('returns a {low, mid, high} triple with low ≤ mid ≤ high', () => {
    const r = estimateVolume(base);
    expect(r.low).toBeLessThanOrEqual(r.mid);
    expect(r.mid).toBeLessThanOrEqual(r.high);
    expect(r.low).toBeGreaterThanOrEqual(0);
  });

  it('mid ≈ low × ~1.66 and ≈ high × ~0.71 (±40% band)', () => {
    const r = estimateVolume(base);
    if (r.mid === 0) return; // degenerate — skip ratio check
    expect(r.low / r.mid).toBeCloseTo(0.6, 1);
    expect(r.high / r.mid).toBeCloseTo(1.4, 1);
  });

  it('produces a non-zero estimate for a reasonable tech search', () => {
    const r = estimateVolume(base);
    expect(r.mid).toBeGreaterThan(0);
  });
});

describe('estimateVolume — properties', () => {
  it('non-decreasing in seniority breadth', () => {
    const narrow = estimateVolume({ ...base, seniority: ['senior'] });
    const wide = estimateVolume({
      ...base,
      seniority: ['junior', 'mid', 'senior', 'lead'],
    });
    expect(wide.mid).toBeGreaterThan(narrow.mid);
  });

  it('non-decreasing when adding more countries', () => {
    const one = estimateVolume({ ...base, countries: ['UA'] });
    const many = estimateVolume({ ...base, countries: ['US', 'GB', 'DE', 'FR', 'NL'] });
    expect(many.mid).toBeGreaterThan(one.mid);
  });

  it('"any" country dominates individual country sets', () => {
    const few = estimateVolume({ ...base, countries: ['UA'] });
    const any = estimateVolume({ ...base, countries: ['any'] });
    expect(any.mid).toBeGreaterThanOrEqual(few.mid);
  });

  it('broader work modes produces higher estimate', () => {
    const remote = estimateVolume({ ...base, workModes: ['remote'] });
    const all = estimateVolume({ ...base, workModes: ['remote', 'hybrid', 'onsite'] });
    expect(all.mid).toBeGreaterThan(remote.mid);
  });

  it('broader stack produces higher estimate (non-strict — equal permitted on rounding)', () => {
    const narrow = estimateVolume({ ...base, stackSize: 1 });
    const wide = estimateVolume({ ...base, stackSize: 5 });
    expect(wide.mid).toBeGreaterThan(narrow.mid);
  });

  it('longer posting-age window produces higher estimate', () => {
    const short = estimateVolume({ ...base, maxPostingAgeDays: 7 });
    const long = estimateVolume({ ...base, maxPostingAgeDays: 90 });
    expect(long.mid).toBeGreaterThan(short.mid);
  });

  it('unreasonably high min-salary collapses estimate', () => {
    const reasonable = estimateVolume({ ...base, minSalaryUsd: 6000 });
    const crazy = estimateVolume({ ...base, minSalaryUsd: 50_000 });
    expect(crazy.mid).toBeLessThan(reasonable.mid);
  });

  it.each(JOB_CATEGORIES)(
    'returns a non-negative integer mid for category %s',
    (category: JobCategory) => {
      const r = estimateVolume({
        ...base,
        category,
        seniority: ['senior'],
        workModes: ['remote', 'hybrid'],
        stackSize: 2,
        minSalaryUsd: 5000,
      });
      expect(Number.isInteger(r.mid)).toBe(true);
      expect(r.mid).toBeGreaterThanOrEqual(0);
    },
  );
});

describe('estimateVolume — validation', () => {
  it('rejects unknown category', () => {
    expect(() =>
      estimateVolume({
        ...base,
        category: 'healthcare' as unknown as JobCategory,
      }),
    ).toThrow(InvalidVolumeInputError);
  });

  it('rejects empty seniority', () => {
    expect(() => estimateVolume({ ...base, seniority: [] })).toThrow(InvalidVolumeInputError);
  });

  it('rejects empty workModes', () => {
    expect(() => estimateVolume({ ...base, workModes: [] })).toThrow(InvalidVolumeInputError);
  });

  it('rejects zero / negative postingAgeDays', () => {
    expect(() => estimateVolume({ ...base, maxPostingAgeDays: 0 })).toThrow(
      InvalidVolumeInputError,
    );
    expect(() => estimateVolume({ ...base, maxPostingAgeDays: -5 })).toThrow(
      InvalidVolumeInputError,
    );
  });

  it('rejects negative stackSize', () => {
    expect(() => estimateVolume({ ...base, stackSize: -1 })).toThrow(InvalidVolumeInputError);
  });
});
