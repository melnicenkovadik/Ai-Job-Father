/**
 * Locale — 5-language MVP set, auto-detected from Telegram initData.
 * Single source of truth; re-exported from domain/user.ts.
 */

export const SUPPORTED_LOCALES = ['en', 'uk', 'ru', 'it', 'pl'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

const SUPPORTED_SET = new Set<string>(SUPPORTED_LOCALES);

/**
 * Map a Telegram `language_code` (or any BCP 47-ish primary tag) to a supported locale.
 * Falls back to `'en'` for unknown / empty / undefined inputs.
 *
 * Examples: `'uk-UA' → 'uk'`, `'fr' → 'en'`, `undefined → 'en'`.
 */
export function detectLocale(languageCode: string | undefined): Locale {
  if (!languageCode) return 'en';
  const primary = languageCode.split('-')[0]?.toLowerCase() ?? '';
  return SUPPORTED_SET.has(primary) ? (primary as Locale) : 'en';
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && SUPPORTED_SET.has(value);
}
