import { describe, expect, it } from 'vitest';
import { extractSkills } from './extract-skills';

describe('extractSkills', () => {
  it('splits a comma-separated skill list', () => {
    const r = extractSkills('React, TypeScript, Next.js, Tailwind');
    expect(r).toEqual([
      { name: 'React' },
      { name: 'TypeScript' },
      { name: 'Next.js' },
      { name: 'Tailwind' },
    ]);
  });

  it('parses years in parentheses', () => {
    const r = extractSkills('React (5 years), TypeScript (4), Next.js (3 yrs)');
    expect(r).toEqual([
      { name: 'React', years: 5 },
      { name: 'TypeScript', years: 4 },
      { name: 'Next.js', years: 3 },
    ]);
  });

  it('parses years as suffix', () => {
    const r = extractSkills('React 5y, TypeScript 4+ years, Postgres 2yrs');
    expect(r.map((s) => [s.name, s.years])).toEqual([
      ['React', 5],
      ['TypeScript', 4],
      ['Postgres', 2],
    ]);
  });

  it('supports bullet / pipe / newline delimiters', () => {
    const r = extractSkills('• React\n• TS | Next.js · Tailwind');
    expect(r.map((s) => s.name)).toEqual(['React', 'TS', 'Next.js', 'Tailwind']);
  });

  it('dedupes case-insensitively, keeps first occurrence', () => {
    const r = extractSkills('React, react, REACT');
    expect(r).toEqual([{ name: 'React' }]);
  });

  it('drops empty chunks and overly long ones', () => {
    const tooLong = 'a'.repeat(41);
    const r = extractSkills(`,  , React,${tooLong}, Next.js`);
    expect(r.map((s) => s.name)).toEqual(['React', 'Next.js']);
  });

  it('clamps unreasonable year values', () => {
    const r = extractSkills('React (99), Go (-5)');
    expect(r).toEqual([{ name: 'React' }, { name: 'Go' }]);
  });

  it('caps at 50 skills', () => {
    const many = Array.from({ length: 80 }, (_, i) => `S${i}`).join(', ');
    const r = extractSkills(many);
    expect(r.length).toBe(50);
  });

  it('returns empty for empty input', () => {
    expect(extractSkills('   ')).toEqual([]);
    expect(extractSkills('')).toEqual([]);
  });

  it('parses Ukrainian years suffix', () => {
    const r = extractSkills('React 5 років, TS 3 рік');
    expect(r.map((s) => [s.name, s.years])).toEqual([
      ['React', 5],
      ['TS', 3],
    ]);
  });
});
