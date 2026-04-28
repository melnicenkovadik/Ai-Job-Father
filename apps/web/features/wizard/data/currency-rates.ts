/**
 * Static currency map for the salary step.
 *
 * Each ISO-3166 code resolves to a local-currency display config. Rates are
 * relative to USD and frozen at the date below — refresh manually every few
 * months. Real-time FX is not wired in MVP (out of scope; scraper does its
 * own normalisation).
 *
 * `rate` is "1 USD = N localUnits". So for EUR 0.92 → $1000 = €920.
 */
export interface CurrencyConfig {
  readonly code: string;
  readonly symbol: string;
  /** Local currency units per 1 USD (snapshot, see RATES_AS_OF). */
  readonly rate: number;
}

export const RATES_AS_OF = '2026-04-28';

const EUR: CurrencyConfig = { code: 'EUR', symbol: '€', rate: 0.92 };
const USD: CurrencyConfig = { code: 'USD', symbol: '$', rate: 1 };
const GBP: CurrencyConfig = { code: 'GBP', symbol: '£', rate: 0.79 };
const CHF: CurrencyConfig = { code: 'CHF', symbol: 'CHF ', rate: 0.9 };
const PLN: CurrencyConfig = { code: 'PLN', symbol: 'zł ', rate: 4.05 };
const CZK: CurrencyConfig = { code: 'CZK', symbol: 'Kč ', rate: 23.5 };
const HUF: CurrencyConfig = { code: 'HUF', symbol: 'Ft ', rate: 360 };
const SEK: CurrencyConfig = { code: 'SEK', symbol: 'kr ', rate: 10.7 };
const DKK: CurrencyConfig = { code: 'DKK', symbol: 'kr ', rate: 6.85 };
const NOK: CurrencyConfig = { code: 'NOK', symbol: 'kr ', rate: 10.6 };
const UAH: CurrencyConfig = { code: 'UAH', symbol: '₴', rate: 39 };
const RON: CurrencyConfig = { code: 'RON', symbol: 'lei ', rate: 4.55 };
const BGN: CurrencyConfig = { code: 'BGN', symbol: 'лв ', rate: 1.8 };

export const CURRENCY_BY_COUNTRY: Record<string, CurrencyConfig> = {
  // EUR-zone
  AT: EUR,
  BE: EUR,
  CY: EUR,
  DE: EUR,
  EE: EUR,
  ES: EUR,
  FI: EUR,
  FR: EUR,
  GR: EUR,
  HR: EUR,
  IE: EUR,
  IT: EUR,
  LT: EUR,
  LU: EUR,
  LV: EUR,
  MT: EUR,
  NL: EUR,
  PT: EUR,
  SI: EUR,
  SK: EUR,
  // Non-EUR Europe
  GB: GBP,
  CH: CHF,
  PL: PLN,
  CZ: CZK,
  HU: HUF,
  SE: SEK,
  DK: DKK,
  NO: NOK,
  IS: NOK,
  RO: RON,
  BG: BGN,
  UA: UAH,
  // Anglosphere & sentinels default to USD.
  US: USD,
  CA: USD,
  AU: USD,
  NZ: USD,
  ANY_REMOTE: USD,
  ANY_EU: EUR,
};

/**
 * Resolve currency for the wizard's selected countries. If the user picked
 * multiple, fall back to USD (no good single answer). If they picked
 * ANY_EU, return EUR. If unknown, return USD.
 */
export function currencyForCountries(countries: readonly string[]): CurrencyConfig {
  if (countries.length === 0) return USD;
  const first = countries[0];
  if (!first) return USD;
  const cfg = CURRENCY_BY_COUNTRY[first];
  if (!cfg) return USD;
  // If they mixed countries with different currencies, default to USD —
  // partial conversions are confusing.
  for (const c of countries.slice(1)) {
    const next = CURRENCY_BY_COUNTRY[c];
    if (next && next.code !== cfg.code) return USD;
  }
  return cfg;
}

export function fromUsd(usd: number, cfg: CurrencyConfig): number {
  return Math.round(usd * cfg.rate);
}
