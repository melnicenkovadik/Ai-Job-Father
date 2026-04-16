import { describe, expect, it } from 'vitest';
import { detectLocale, isLocale, SUPPORTED_LOCALES } from './locale';

describe('SUPPORTED_LOCALES', () => {
  it('exposes the five MVP locales in a stable order', () => {
    expect(SUPPORTED_LOCALES).toEqual(['en', 'uk', 'ru', 'it', 'pl']);
  });
});

describe('detectLocale', () => {
  it.each<[string | undefined, 'en' | 'uk' | 'ru' | 'it' | 'pl']>([
    ['en', 'en'],
    ['en-US', 'en'],
    ['uk', 'uk'],
    ['uk-UA', 'uk'],
    ['ru', 'ru'],
    ['ru-RU', 'ru'],
    ['it', 'it'],
    ['it-IT', 'it'],
    ['pl', 'pl'],
    ['pl-PL', 'pl'],
    ['fr', 'en'],
    ['zh-CN', 'en'],
    ['', 'en'],
    [undefined, 'en'],
    ['EN', 'en'],
    ['UK-ua', 'uk'],
  ])('maps %s → %s', (input, expected) => {
    expect(detectLocale(input)).toBe(expected);
  });
});

describe('isLocale', () => {
  it('returns true for supported codes', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(isLocale(locale)).toBe(true);
    }
  });

  it('returns false for anything else', () => {
    expect(isLocale('fr')).toBe(false);
    expect(isLocale('en-US')).toBe(false);
    expect(isLocale(undefined)).toBe(false);
    expect(isLocale(null)).toBe(false);
    expect(isLocale(42)).toBe(false);
    expect(isLocale('')).toBe(false);
  });
});
