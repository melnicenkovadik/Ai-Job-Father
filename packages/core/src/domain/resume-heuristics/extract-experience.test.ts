import { describe, expect, it } from 'vitest';
import { extractExperience } from './extract-experience';

describe('extractExperience', () => {
  it('parses "Company — Role, YYYY-MM — present" entries', () => {
    const body = [
      'Acme Corp — Senior Frontend Developer, 2022-01 — present',
      'Delivered React 18 migration and a design-system rollout.',
      '',
      'Startup Inc — Frontend Developer, 2019-06 — 2021-12',
      'Migrated a Vue 2 codebase to React.',
    ].join('\n');

    const r = extractExperience(body);
    expect(r.length).toBe(2);

    const [first, second] = r;
    expect(first?.company).toBe('Acme Corp');
    expect(first?.role).toBe('Senior Frontend Developer');
    expect(first?.startMonth).toBe('2022-01');
    expect(first?.endMonth).toBeNull();
    expect(first?.description).toContain('React 18');

    expect(second?.company).toBe('Startup Inc');
    expect(second?.role).toBe('Frontend Developer');
    expect(second?.startMonth).toBe('2019-06');
    expect(second?.endMonth).toBe('2021-12');
  });

  it('parses "Role at Company, Jan 2022 — Dec 2024" entries', () => {
    const body = 'Senior Designer at Acme Corp, Jan 2022 — Dec 2024';
    const r = extractExperience(body);
    expect(r[0]?.role).toBe('Senior Designer');
    expect(r[0]?.company).toBe('Acme Corp');
    expect(r[0]?.startMonth).toBe('2022-01');
    expect(r[0]?.endMonth).toBe('2024-12');
  });

  it('treats year-only entries as YYYY-01', () => {
    const body = 'Acme Corp — Senior Developer, 2019';
    const r = extractExperience(body);
    expect(r[0]?.startMonth).toBe('2019-01');
    expect(r[0]?.endMonth).toBeNull();
  });

  it('skips chunks without a date', () => {
    const body = 'Acme Corp — Senior Developer (no dates here)';
    const r = extractExperience(body);
    expect(r).toEqual([]);
  });

  it('handles Ukrainian "present" variants', () => {
    const body = 'Acme — Розробник, 2022 — нині';
    const r = extractExperience(body);
    expect(r[0]?.endMonth).toBeNull();
    expect(r[0]?.company).toBe('Acme');
  });

  it('caps at 20 entries', () => {
    const entries = Array.from(
      { length: 25 },
      (_, i) => `Co${i} — Senior Developer, 20${(10 + i).toString().padStart(2, '0')}-01 — present`,
    );
    const body = entries.join('\n\n');
    const r = extractExperience(body);
    expect(r.length).toBe(20);
  });

  it('truncates long descriptions with ellipsis', () => {
    const body = `Acme — Senior Developer, 2022-01 — present\n${'a'.repeat(600)}`;
    const r = extractExperience(body);
    const desc = r[0]?.description;
    expect(desc?.length).toBeLessThanOrEqual(400);
    expect(desc?.endsWith('…')).toBe(true);
  });

  it('returns empty on empty input', () => {
    expect(extractExperience('')).toEqual([]);
    expect(extractExperience('   \n\n   ')).toEqual([]);
  });
});
