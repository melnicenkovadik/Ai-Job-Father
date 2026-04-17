import { describe, expect, it } from 'vitest';
import { CATEGORY_META, JOB_CATEGORIES, type JobCategory, isJobCategory } from './job-category';

describe('JOB_CATEGORIES', () => {
  it('contains exactly 12 canonical slugs in declared order', () => {
    expect(JOB_CATEGORIES).toEqual([
      'tech',
      'design',
      'marketing',
      'sales',
      'product',
      'finance',
      'hr',
      'support',
      'content',
      'ops',
      'data',
      'web3',
    ]);
  });

  it('has unique slugs', () => {
    expect(new Set(JOB_CATEGORIES).size).toBe(JOB_CATEGORIES.length);
  });
});

describe('isJobCategory', () => {
  it.each(JOB_CATEGORIES)('accepts canonical slug %s', (slug) => {
    expect(isJobCategory(slug)).toBe(true);
  });

  it.each(['', 'TECH', 'healthcare', 'legal', ' tech', 42, null, undefined, {}])(
    'rejects non-canonical input %p',
    (bad) => {
      expect(isJobCategory(bad)).toBe(false);
    },
  );
});

describe('CATEGORY_META', () => {
  it('has an entry for every slug in JOB_CATEGORIES', () => {
    for (const slug of JOB_CATEGORIES) {
      const meta = CATEGORY_META[slug];
      expect(meta).toBeDefined();
      expect(meta.slug).toBe(slug);
    }
  });

  it('every entry has non-empty label, intent, iconHint', () => {
    for (const slug of JOB_CATEGORIES) {
      const meta = CATEGORY_META[slug];
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.intent.length).toBeGreaterThan(0);
      expect(meta.iconHint.length).toBeGreaterThan(0);
    }
  });

  it('slug keys match JOB_CATEGORIES exactly (no stragglers)', () => {
    const metaKeys = Object.keys(CATEGORY_META) as JobCategory[];
    expect(metaKeys.sort()).toEqual([...JOB_CATEGORIES].sort());
  });
});
