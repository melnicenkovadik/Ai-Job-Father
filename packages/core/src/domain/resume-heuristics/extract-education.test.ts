import { describe, expect, it } from 'vitest';
import { extractEducation } from './extract-education';

describe('extractEducation', () => {
  it('parses school + degree + year range', () => {
    const body = 'Kyiv Polytechnic Institute — BSc Computer Science, 2015 — 2019';
    const r = extractEducation(body);
    expect(r[0]?.school).toBe('Kyiv Polytechnic Institute');
    expect(r[0]?.degree).toBe('BSc Computer Science');
    expect(r[0]?.startMonth).toBe('2015-01');
    expect(r[0]?.endMonth).toBe('2019-01');
  });

  it('parses single-year entries as start only', () => {
    const body = 'MIT — MSc AI, 2021';
    const r = extractEducation(body);
    expect(r[0]?.startMonth).toBe('2021-01');
    expect(r[0]?.endMonth).toBeUndefined();
  });

  it('handles newline-separated school + degree', () => {
    const body = 'Sapienza Università di Roma\nBSc Physics\n2018-2022';
    const r = extractEducation(body);
    expect(r[0]?.school).toBe('Sapienza Università di Roma');
    expect(r[0]?.degree).toBe('BSc Physics');
  });

  it('parses multiple entries separated by blank lines', () => {
    const body = 'KPI — BSc CS, 2015 — 2019\n\nStanford — MSc ML, 2020 — 2022';
    const r = extractEducation(body);
    expect(r).toHaveLength(2);
    expect(r[0]?.school).toBe('KPI');
    expect(r[1]?.school).toBe('Stanford');
  });

  it('caps at 10 entries', () => {
    const entries = Array.from({ length: 15 }, (_, i) => `School${i} — Degree, 200${i}`);
    const body = entries.join('\n\n');
    const r = extractEducation(body);
    expect(r.length).toBe(10);
  });

  it('returns empty on empty input', () => {
    expect(extractEducation('')).toEqual([]);
    expect(extractEducation('   ')).toEqual([]);
  });

  it('accepts entry without degree or dates', () => {
    const body = 'Just University Name Here';
    const r = extractEducation(body);
    expect(r[0]?.school).toBe('Just University Name Here');
    expect(r[0]?.degree).toBeUndefined();
    expect(r[0]?.startMonth).toBeUndefined();
  });
});
