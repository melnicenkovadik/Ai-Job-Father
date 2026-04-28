/**
 * Language list used by the wizard's "languages for interviews" step.
 * Codes are ISO-639-1 uppercased (matches existing draft.languages strings).
 * Native names are shown alongside so a user fluent in Czech can scan past
 * the latin codes for their language.
 */
export interface LanguageEntry {
  readonly code: string;
  readonly native: string;
  readonly english: string;
}

export const LANGUAGES: readonly LanguageEntry[] = [
  { code: 'EN', native: 'English', english: 'English' },
  { code: 'DE', native: 'Deutsch', english: 'German' },
  { code: 'FR', native: 'Français', english: 'French' },
  { code: 'ES', native: 'Español', english: 'Spanish' },
  { code: 'IT', native: 'Italiano', english: 'Italian' },
  { code: 'NL', native: 'Nederlands', english: 'Dutch' },
  { code: 'PL', native: 'Polski', english: 'Polish' },
  { code: 'PT', native: 'Português', english: 'Portuguese' },
  { code: 'CS', native: 'Čeština', english: 'Czech' },
  { code: 'SK', native: 'Slovenčina', english: 'Slovak' },
  { code: 'HU', native: 'Magyar', english: 'Hungarian' },
  { code: 'RO', native: 'Română', english: 'Romanian' },
  { code: 'SV', native: 'Svenska', english: 'Swedish' },
  { code: 'DA', native: 'Dansk', english: 'Danish' },
  { code: 'NO', native: 'Norsk', english: 'Norwegian' },
  { code: 'FI', native: 'Suomi', english: 'Finnish' },
  { code: 'UK', native: 'Українська', english: 'Ukrainian' },
  { code: 'RU', native: 'Русский', english: 'Russian' },
  { code: 'BE', native: 'Беларуская', english: 'Belarusian' },
  { code: 'KZ', native: 'Қазақша', english: 'Kazakh' },
  { code: 'TR', native: 'Türkçe', english: 'Turkish' },
  { code: 'HE', native: 'עברית', english: 'Hebrew' },
  { code: 'AR', native: 'العربية', english: 'Arabic' },
  { code: 'EL', native: 'Ελληνικά', english: 'Greek' },
  { code: 'GA', native: 'Gaeilge', english: 'Irish' },
];

/**
 * Map from country code (ISO-3166 alpha-2) to its primary working language
 * code (uppercase ISO-639-1). The wizard uses this to pin one language to
 * the top of the list as a "we recommend this" hint.
 *
 * Multi-lingual countries default to the most-likely-business language.
 */
export const PRIMARY_LANG_BY_COUNTRY: Record<string, string> = {
  AT: 'DE',
  BE: 'NL',
  BG: 'BG',
  HR: 'HR',
  CY: 'EL',
  CZ: 'CS',
  DK: 'DA',
  EE: 'EN',
  FI: 'FI',
  FR: 'FR',
  DE: 'DE',
  GR: 'EL',
  HU: 'HU',
  IE: 'EN',
  IT: 'IT',
  LV: 'EN',
  LT: 'EN',
  LU: 'FR',
  MT: 'EN',
  NL: 'NL',
  PL: 'PL',
  PT: 'PT',
  RO: 'RO',
  SK: 'SK',
  SI: 'SL',
  ES: 'ES',
  SE: 'SV',
  IS: 'EN',
  LI: 'DE',
  NO: 'NO',
  CH: 'DE',
  GB: 'EN',
  // CIS: in MVP business interviews are mostly in EN or RU.
  UA: 'UK',
  BY: 'BE',
  KZ: 'KZ',
  UZ: 'EN',
  GE: 'EN',
  AM: 'EN',
  AZ: 'EN',
  MD: 'RO',
  KG: 'EN',
  TJ: 'EN',
  // Anglosphere & sentinels.
  US: 'EN',
  CA: 'EN',
  AU: 'EN',
  NZ: 'EN',
  IL: 'HE',
  TR: 'TR',
  AE: 'EN',
  SG: 'EN',
  ANY_EU: 'EN',
  ANY_REMOTE: 'EN',
};

export function primaryLanguageFor(countries: readonly string[]): string | undefined {
  for (const c of countries) {
    const lang = PRIMARY_LANG_BY_COUNTRY[c];
    if (lang) return lang;
  }
  return undefined;
}
