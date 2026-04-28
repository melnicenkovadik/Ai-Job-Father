/**
 * Country picker data for the wizard.
 *
 * Sections in display order:
 *   1. Quick picks — "Any EU" / "Any Remote" pseudo-codes the downstream
 *      worker treats as wildcards.
 *   2. Europe (EU/EEA + UK + CH).
 *   3. CIS (post-Soviet states).
 *   4. Anglosphere (US/CA/AU/NZ).
 *   5. Other commonly-asked-for markets.
 *
 * `code` is what the draft.countries array stores; the downstream scraper
 * reads it 1:1. ISO-3166-1 alpha-2 is preferred; quick picks use ANY_*
 * sentinels to stay namespaced.
 */
export type CountrySection = 'quick' | 'europe' | 'cis' | 'anglo' | 'other';

export interface CountryEntry {
  readonly code: string;
  readonly name: string;
  readonly section: CountrySection;
}

export const COUNTRIES: readonly CountryEntry[] = [
  // 1. Quick picks
  { code: 'ANY_EU', name: 'Any EU', section: 'quick' },
  { code: 'ANY_REMOTE', name: 'Any Remote', section: 'quick' },

  // 2. Europe — EU/EEA + UK + CH
  { code: 'AT', name: 'Austria', section: 'europe' },
  { code: 'BE', name: 'Belgium', section: 'europe' },
  { code: 'BG', name: 'Bulgaria', section: 'europe' },
  { code: 'HR', name: 'Croatia', section: 'europe' },
  { code: 'CY', name: 'Cyprus', section: 'europe' },
  { code: 'CZ', name: 'Czechia', section: 'europe' },
  { code: 'DK', name: 'Denmark', section: 'europe' },
  { code: 'EE', name: 'Estonia', section: 'europe' },
  { code: 'FI', name: 'Finland', section: 'europe' },
  { code: 'FR', name: 'France', section: 'europe' },
  { code: 'DE', name: 'Germany', section: 'europe' },
  { code: 'GR', name: 'Greece', section: 'europe' },
  { code: 'HU', name: 'Hungary', section: 'europe' },
  { code: 'IE', name: 'Ireland', section: 'europe' },
  { code: 'IT', name: 'Italy', section: 'europe' },
  { code: 'LV', name: 'Latvia', section: 'europe' },
  { code: 'LT', name: 'Lithuania', section: 'europe' },
  { code: 'LU', name: 'Luxembourg', section: 'europe' },
  { code: 'MT', name: 'Malta', section: 'europe' },
  { code: 'NL', name: 'Netherlands', section: 'europe' },
  { code: 'PL', name: 'Poland', section: 'europe' },
  { code: 'PT', name: 'Portugal', section: 'europe' },
  { code: 'RO', name: 'Romania', section: 'europe' },
  { code: 'SK', name: 'Slovakia', section: 'europe' },
  { code: 'SI', name: 'Slovenia', section: 'europe' },
  { code: 'ES', name: 'Spain', section: 'europe' },
  { code: 'SE', name: 'Sweden', section: 'europe' },
  { code: 'IS', name: 'Iceland', section: 'europe' },
  { code: 'LI', name: 'Liechtenstein', section: 'europe' },
  { code: 'NO', name: 'Norway', section: 'europe' },
  { code: 'CH', name: 'Switzerland', section: 'europe' },
  { code: 'GB', name: 'United Kingdom', section: 'europe' },

  // 3. CIS
  { code: 'UA', name: 'Ukraine', section: 'cis' },
  { code: 'BY', name: 'Belarus', section: 'cis' },
  { code: 'KZ', name: 'Kazakhstan', section: 'cis' },
  { code: 'UZ', name: 'Uzbekistan', section: 'cis' },
  { code: 'GE', name: 'Georgia', section: 'cis' },
  { code: 'AM', name: 'Armenia', section: 'cis' },
  { code: 'AZ', name: 'Azerbaijan', section: 'cis' },
  { code: 'MD', name: 'Moldova', section: 'cis' },
  { code: 'KG', name: 'Kyrgyzstan', section: 'cis' },
  { code: 'TJ', name: 'Tajikistan', section: 'cis' },

  // 4. Anglosphere
  { code: 'US', name: 'United States', section: 'anglo' },
  { code: 'CA', name: 'Canada', section: 'anglo' },
  { code: 'AU', name: 'Australia', section: 'anglo' },
  { code: 'NZ', name: 'New Zealand', section: 'anglo' },

  // 5. Other markets
  { code: 'IL', name: 'Israel', section: 'other' },
  { code: 'TR', name: 'Turkey', section: 'other' },
  { code: 'AE', name: 'United Arab Emirates', section: 'other' },
  { code: 'SG', name: 'Singapore', section: 'other' },
];

const QUICK_FLAGS: Record<string, string> = {
  ANY_EU: '🇪🇺',
  ANY_REMOTE: '🌍',
};

/**
 * ISO 3166 alpha-2 → emoji flag via Regional Indicator Symbols.
 * Returns a generic globe for the ANY_* sentinels.
 */
export function flagFor(code: string): string {
  if (QUICK_FLAGS[code]) return QUICK_FLAGS[code];
  if (code.length !== 2) return '🌍';
  const A = 'A'.charCodeAt(0);
  const ric = 0x1f1e6;
  const cp1 = ric + (code.charCodeAt(0) - A);
  const cp2 = ric + (code.charCodeAt(1) - A);
  if (cp1 < ric || cp2 < ric) return '🌍';
  return String.fromCodePoint(cp1, cp2);
}

/**
 * Case-insensitive prefix match on name OR exact code match. Quick picks
 * always show on empty query.
 */
export function filterCountries(query: string): readonly CountryEntry[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return COUNTRIES;
  const upper = q.toUpperCase();
  return COUNTRIES.filter((c) => c.code === upper || c.name.toLowerCase().includes(q));
}
