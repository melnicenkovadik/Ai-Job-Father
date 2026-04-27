/**
 * Currency conversion — pure functions. Adapters supply the rate.
 *
 * USD cents are the canonical unit (priceCampaign output). At checkout we
 * convert into Telegram Stars (integer ⭐ amount) or TON nano-units (1 TON =
 * 1e9 nano).
 */

import { DomainError } from './user';

export class InvalidRateError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Convert USD cents to Stars. `starsPerUsdCent` is the live rate; e.g. 0.5
 * means $0.50 → 25 Stars (i.e. 1 Star ≈ $0.02). Result is rounded UP so the
 * Mini App never charges fractional Stars (Telegram quantises to whole units).
 */
export function usdCentsToStars(amountCents: number, starsPerUsdCent: number): number {
  if (!Number.isFinite(starsPerUsdCent) || starsPerUsdCent <= 0) {
    throw new InvalidRateError(`starsPerUsdCent must be > 0, got ${starsPerUsdCent}`);
  }
  if (!Number.isFinite(amountCents) || amountCents < 0) {
    throw new InvalidRateError(`amountCents must be ≥ 0, got ${amountCents}`);
  }
  return Math.ceil(amountCents * starsPerUsdCent);
}

/**
 * Convert USD cents to TON nano (1 TON = 1e9 nano). `usdCentsPerTon` is the
 * inverse rate that the wizard collects today (e.g. $2.50/TON ⇒ 250 cents
 * per TON). Output is integer nanos suitable for a TonConnect transaction.
 */
export function usdCentsToTonNano(amountCents: number, usdCentsPerTon: number): bigint {
  if (!Number.isFinite(usdCentsPerTon) || usdCentsPerTon <= 0) {
    throw new InvalidRateError(`usdCentsPerTon must be > 0, got ${usdCentsPerTon}`);
  }
  if (!Number.isFinite(amountCents) || amountCents < 0) {
    throw new InvalidRateError(`amountCents must be ≥ 0, got ${amountCents}`);
  }
  // Multiply through 1e9 first to avoid float drift on small sub-TON amounts.
  const tonScaled = (amountCents * 1_000_000_000) / usdCentsPerTon;
  return BigInt(Math.round(tonScaled));
}

export const DEFAULT_STARS_PER_USD_CENT = 0.5;
export const DEFAULT_USD_CENTS_PER_TON = 250;
