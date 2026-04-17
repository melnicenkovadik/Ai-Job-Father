import { describe, expect, it } from 'vitest';
import { extractLanguages } from './extract-languages';

describe('extractLanguages', () => {
  it('pairs language names with CEFR tokens', () => {
    const r = extractLanguages('English C1, Italian B1, Ukrainian C2');
    expect(r).toEqual([
      { code: 'en', level: 'C1' },
      { code: 'it', level: 'B1' },
      { code: 'uk', level: 'C2' },
    ]);
  });

  it('treats "native" markers as C2 across locales', () => {
    const r = extractLanguages('Ukrainian native, English C1');
    expect(r).toEqual([
      { code: 'uk', level: 'C2' },
      { code: 'en', level: 'C1' },
    ]);

    const ua = extractLanguages('українська рідна, англійська B2');
    expect(ua[0]).toEqual({ code: 'uk', level: 'C2' });

    const it = extractLanguages('Italiano madrelingua, Inglese C1');
    expect(it[0]).toEqual({ code: 'it', level: 'C2' });
  });

  it('infers level from verbal markers (fluent / intermediate / basic)', () => {
    const r = extractLanguages('English fluent, German intermediate, Spanish basic');
    expect(r.map((l) => l.level)).toEqual(['C1', 'B2', 'A2']);
  });

  it('handles bare ISO codes', () => {
    const r = extractLanguages('EN C1, IT B1, PL A2');
    expect(r.map((l) => l.code)).toEqual(['en', 'it', 'pl']);
  });

  it('parses Ukrainian language section', () => {
    const r = extractLanguages('українська - рідна\nанглійська B2\nіталійська A2');
    expect(r).toEqual([
      { code: 'uk', level: 'C2' },
      { code: 'en', level: 'B2' },
      { code: 'it', level: 'A2' },
    ]);
  });

  it('parses Russian language section', () => {
    const r = extractLanguages('русский - родной; английский C1');
    expect(r).toEqual([
      { code: 'ru', level: 'C2' },
      { code: 'en', level: 'C1' },
    ]);
  });

  it('dedupes by language code', () => {
    const r = extractLanguages('English C1, English C2, en A2');
    expect(r).toEqual([{ code: 'en', level: 'C1' }]);
  });

  it('drops entries without a recognisable level', () => {
    const r = extractLanguages('English is my best, Italian C1');
    expect(r).toEqual([{ code: 'it', level: 'C1' }]);
  });

  it('returns empty on empty input', () => {
    expect(extractLanguages('')).toEqual([]);
    expect(extractLanguages('   ')).toEqual([]);
  });
});
