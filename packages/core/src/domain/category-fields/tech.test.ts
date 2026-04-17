import { describe, expect, it } from 'vitest';
import { TECH_STACK_MAX, techCategoryFieldsSchema, techStackItemSchema } from './tech';

describe('techStackItemSchema', () => {
  it('accepts a valid stack item', () => {
    const r = techStackItemSchema.parse({ name: 'React', years_min: 5, is_hard: true });
    expect(r.name).toBe('React');
    expect(r.is_hard).toBe(true);
  });

  it('rejects empty name', () => {
    expect(() => techStackItemSchema.parse({ name: '', years_min: 5, is_hard: true })).toThrow();
  });

  it('rejects name > 40 chars', () => {
    expect(() =>
      techStackItemSchema.parse({ name: 'x'.repeat(41), years_min: 5, is_hard: false }),
    ).toThrow();
  });

  it('rejects negative years_min', () => {
    expect(() =>
      techStackItemSchema.parse({ name: 'React', years_min: -1, is_hard: false }),
    ).toThrow();
  });

  it('rejects non-integer years_min', () => {
    expect(() =>
      techStackItemSchema.parse({ name: 'React', years_min: 1.5, is_hard: false }),
    ).toThrow();
  });
});

describe('techCategoryFieldsSchema', () => {
  it('accepts minimal valid payload (1 stack item)', () => {
    const r = techCategoryFieldsSchema.parse({
      stack: [{ name: 'React', years_min: 5, is_hard: true }],
    });
    expect(r.stack).toHaveLength(1);
    expect(r.domains).toEqual([]);
    expect(r.company_stages).toEqual([]);
  });

  it('accepts full payload (5 stack items, domains, stages)', () => {
    const r = techCategoryFieldsSchema.parse({
      stack: Array.from({ length: 5 }, (_, i) => ({
        name: `T${i}`,
        years_min: i,
        is_hard: i === 0,
      })),
      domains: ['fintech', 'saas'],
      company_stages: ['series_b_plus', 'enterprise'],
    });
    expect(r.stack).toHaveLength(TECH_STACK_MAX);
    expect(r.domains).toEqual(['fintech', 'saas']);
  });

  it('rejects empty stack', () => {
    expect(() => techCategoryFieldsSchema.parse({ stack: [] })).toThrow();
  });

  it('rejects stack > 5', () => {
    expect(() =>
      techCategoryFieldsSchema.parse({
        stack: Array.from({ length: 6 }, (_, i) => ({
          name: `T${i}`,
          years_min: 1,
          is_hard: false,
        })),
      }),
    ).toThrow();
  });

  it('rejects duplicate stack names (case-insensitive)', () => {
    expect(() =>
      techCategoryFieldsSchema.parse({
        stack: [
          { name: 'React', years_min: 5, is_hard: true },
          { name: 'react', years_min: 3, is_hard: false },
        ],
      }),
    ).toThrow();
  });

  it('rejects unknown domain', () => {
    expect(() =>
      techCategoryFieldsSchema.parse({
        stack: [{ name: 'React', years_min: 5, is_hard: true }],
        domains: ['healthcare-app'],
      }),
    ).toThrow();
  });

  it('rejects extra fields (strict mode)', () => {
    expect(() =>
      techCategoryFieldsSchema.parse({
        stack: [{ name: 'React', years_min: 5, is_hard: true }],
        unknown_field: 'oops',
      }),
    ).toThrow();
  });
});
