import { describe, expect, it } from 'vitest';
import { canonicalJSON, similarity, snapshotHash } from './dedup';

describe('canonicalJSON', () => {
  it('sorts object keys', () => {
    expect(canonicalJSON({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  it('preserves array order', () => {
    expect(canonicalJSON([3, 1, 2])).toBe('[3,1,2]');
  });

  it('recurses into nested structures', () => {
    const a = { z: { b: 2, a: [{ y: 1, x: 0 }] }, a: 1 };
    const b = { a: 1, z: { a: [{ x: 0, y: 1 }], b: 2 } };
    expect(canonicalJSON(a)).toBe(canonicalJSON(b));
  });

  it('key-order invariance yields identical hashes', () => {
    const a = { b: { z: 1, y: 2 }, a: [1, 2] };
    const b = { a: [1, 2], b: { y: 2, z: 1 } };
    expect(snapshotHash(a)).toBe(snapshotHash(b));
  });

  it('throws on non-finite numbers', () => {
    expect(() => canonicalJSON(Number.NaN)).toThrow();
    expect(() => canonicalJSON(Number.POSITIVE_INFINITY)).toThrow();
  });

  it('handles empty object / empty array', () => {
    expect(canonicalJSON({})).toBe('{}');
    expect(canonicalJSON([])).toBe('[]');
    expect(canonicalJSON({ a: {}, b: [] })).toBe('{"a":{},"b":[]}');
  });
});

describe('snapshotHash', () => {
  it('is 64 hex chars (SHA-256)', () => {
    expect(snapshotHash({ x: 1 })).toMatch(/^[a-f0-9]{64}$/);
  });

  it('equal inputs ⇒ equal hashes', () => {
    expect(snapshotHash({ a: 1, b: 2 })).toBe(snapshotHash({ b: 2, a: 1 }));
  });

  it('different inputs ⇒ different hashes', () => {
    expect(snapshotHash({ a: 1 })).not.toBe(snapshotHash({ a: 2 }));
  });
});

describe('similarity', () => {
  it('identical objects ⇒ 1.0', () => {
    expect(similarity({ a: 1, b: [2, 3] }, { a: 1, b: [2, 3] })).toBe(1);
  });

  it('key-order-invariant ⇒ 1.0', () => {
    expect(similarity({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(1);
  });

  it('disjoint objects ⇒ 0.0', () => {
    expect(similarity({ a: 1 }, { b: 2 })).toBe(0);
  });

  it('overlapping objects ⇒ strictly between 0 and 1', () => {
    const s = similarity({ a: 1, b: 2, c: 3 }, { a: 1, b: 2, d: 4 });
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThan(1);
  });

  it('symmetric', () => {
    const a = { a: 1, b: [2, 3] };
    const b = { a: 1, b: [2, 4] };
    expect(similarity(a, b)).toBe(similarity(b, a));
  });

  it('empty vs empty ⇒ 1.0', () => {
    expect(similarity({}, {})).toBe(1);
  });

  it('detects near-duplicate snapshots (small single-field diff)', () => {
    const a = {
      category: 'tech',
      target_roles: [{ label: 'Frontend Developer', esco_code: '2512.4' }],
      countries: ['UA', 'PL', 'DE'],
      seniority: ['senior'],
      work_modes: ['remote', 'hybrid'],
      salary_min: 5000,
      quota: 50,
    };
    const b = {
      category: 'tech',
      target_roles: [{ label: 'Frontend Developer', esco_code: '2512.4' }],
      countries: ['UA', 'PL', 'DE'],
      seniority: ['senior'],
      work_modes: ['remote', 'hybrid'],
      salary_min: 5000,
      quota: 75, // only quota differs
    };
    // Plain Jaccard over (path=value) pairs: 9 shared / 11 total (two quota lines) ≈ 0.82.
    // 0.8 is the soft threshold the wizard Review screen will surface "looks like a
    // previous paid campaign" warnings at — document it here so tuning the threshold in
    // one place (wizard UX) stays consistent with what the math produces.
    expect(similarity(a, b)).toBeGreaterThanOrEqual(0.8);
  });

  it('distinguishes meaningfully different snapshots', () => {
    const frontend = {
      category: 'tech',
      target_roles: [{ label: 'Frontend' }],
      countries: ['UA'],
      stack: ['React', 'TypeScript'],
    };
    const sales = {
      category: 'sales',
      target_roles: [{ label: 'Enterprise AE' }],
      countries: ['US', 'GB'],
      segment: 'enterprise',
    };
    expect(similarity(frontend, sales)).toBeLessThan(0.3);
  });
});
