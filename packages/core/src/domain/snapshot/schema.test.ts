import { describe, expect, it } from 'vitest';
import { CURRENT_SNAPSHOT_VERSION, type SnapshotV1, snapshotV1Schema } from './schema';

const baseSnapshot: SnapshotV1 = {
  schema_version: 1,
  locale_at_checkout: 'en',
  category: 'tech',
  universal: {
    target_roles: [{ label: 'Frontend Developer', esco_code: '2512.4', is_custom: false }],
    seniority: ['senior', 'lead'],
    countries: ['UA', 'PL', 'DE', 'GB'],
    work_modes: ['remote', 'hybrid'],
    timezone_tolerance_hours: 4,
    user_timezone: 'Europe/Rome',
    relocation_willing: false,
    employment_types: ['full_time', 'contract'],
    salary: {
      min_usd: 4000,
      max_usd: null,
      display_currency: 'USD',
      negotiable: true,
    },
    spoken_languages: [
      { code: 'en', level: 'C1' },
      { code: 'it', level: 'B1' },
    ],
    exclude_keywords: ['casino', 'gambling'],
    exclude_companies: ['Acme Corp'],
    max_posting_age_days: 30,
    target_quota: 50,
    hard_requirements: ['seniority', 'countries', 'salary'],
  },
  category_fields: {
    stack: [
      { name: 'React', years_min: 5, is_hard: true },
      { name: 'TypeScript', years_min: 4, is_hard: true },
      { name: 'Next.js', years_min: 3, is_hard: false },
    ],
    domains: ['fintech', 'saas'],
    company_stages: ['series_b_plus', 'enterprise'],
  },
  meta: {
    created_via: 'wizard',
    wizard_version: '1.0.0',
    profile_id: '597cbe39-2607-4ef5-abc3-b5647b0ebe2b',
    profile_name: 'Frontend EU',
  },
};

describe('snapshotV1Schema — tech variant', () => {
  it('accepts the full happy-path tech snapshot', () => {
    const r = snapshotV1Schema.parse(baseSnapshot);
    expect(r.category).toBe('tech');
    expect(r.schema_version).toBe(1);
  });

  it('rejects schema_version other than 1', () => {
    expect(() =>
      snapshotV1Schema.parse({ ...baseSnapshot, schema_version: 2 as unknown as 1 }),
    ).toThrow();
  });

  it('rejects empty target_roles', () => {
    expect(() =>
      snapshotV1Schema.parse({
        ...baseSnapshot,
        universal: { ...baseSnapshot.universal, target_roles: [] },
      }),
    ).toThrow();
  });

  it('rejects target_roles > 5', () => {
    expect(() =>
      snapshotV1Schema.parse({
        ...baseSnapshot,
        universal: {
          ...baseSnapshot.universal,
          target_roles: Array.from({ length: 6 }, () => ({
            label: 'X',
            is_custom: true,
          })),
        },
      }),
    ).toThrow();
  });

  it('rejects salary where max < min', () => {
    expect(() =>
      snapshotV1Schema.parse({
        ...baseSnapshot,
        universal: {
          ...baseSnapshot.universal,
          salary: {
            min_usd: 5000,
            max_usd: 3000,
            display_currency: 'USD',
            negotiable: false,
          },
        },
      }),
    ).toThrow();
  });

  it('rejects empty tech.stack', () => {
    expect(() =>
      snapshotV1Schema.parse({
        ...baseSnapshot,
        category_fields: { ...baseSnapshot.category_fields, stack: [] },
      }),
    ).toThrow();
  });

  it('rejects unknown country code shape', () => {
    expect(() =>
      snapshotV1Schema.parse({
        ...baseSnapshot,
        universal: { ...baseSnapshot.universal, countries: ['Ukraine'] },
      }),
    ).toThrow();
  });

  it('accepts "any" / "any_eu" country sentinels', () => {
    expect(() =>
      snapshotV1Schema.parse({
        ...baseSnapshot,
        universal: { ...baseSnapshot.universal, countries: ['any'] },
      }),
    ).not.toThrow();
    expect(() =>
      snapshotV1Schema.parse({
        ...baseSnapshot,
        universal: { ...baseSnapshot.universal, countries: ['any_eu'] },
      }),
    ).not.toThrow();
  });

  it('rejects target_quota > 500 or < 1', () => {
    expect(() =>
      snapshotV1Schema.parse({
        ...baseSnapshot,
        universal: { ...baseSnapshot.universal, target_quota: 501 },
      }),
    ).toThrow();
    expect(() =>
      snapshotV1Schema.parse({
        ...baseSnapshot,
        universal: { ...baseSnapshot.universal, target_quota: 0 },
      }),
    ).toThrow();
  });
});

describe('snapshotV1Schema — non-tech placeholder variant', () => {
  it('accepts a design snapshot with arbitrary category_fields', () => {
    const design = {
      ...baseSnapshot,
      category: 'design' as const,
      category_fields: { tools: ['Figma'], specialization: 'product' },
    };
    const r = snapshotV1Schema.parse(design);
    expect(r.category).toBe('design');
  });

  it('keeps the tech variant strict (cannot use its placeholder branch)', () => {
    expect(() =>
      snapshotV1Schema.parse({
        ...baseSnapshot,
        category_fields: { tools: ['Figma'] },
      }),
    ).toThrow();
  });
});

describe('snapshot version constant', () => {
  it('CURRENT_SNAPSHOT_VERSION equals 1', () => {
    expect(CURRENT_SNAPSHOT_VERSION).toBe(1);
  });
});
