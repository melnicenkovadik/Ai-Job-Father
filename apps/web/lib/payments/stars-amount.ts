import 'server-only';
import { DEFAULT_STARS_PER_USD_CENT, usdCentsToStars } from '@ai-job-bot/core';
import { env } from '../env';

/**
 * Stars-amount resolver shared between `/api/payments/init` (issuer) and
 * the bot's `pre_checkout_query` handler (verifier). Both paths must agree
 * — otherwise pre-checkout will reject the invoice as a price mismatch.
 *
 * Priority order:
 *   1. STARS_TEST_MODE=true|1  → always 1 ⭐ regardless of price (cheapest test).
 *   2. STARS_TEST_AMOUNT=N     → fixed N ⭐ (when you want non-1 for tests).
 *   3. real conversion         → priceAmountCents → ⭐ via canonical rate.
 */
export function resolveStarsAmount(priceAmountCents: number): number {
  if (isTestModeOn()) return 1;
  const override = env.STARS_TEST_AMOUNT;
  if (override !== undefined && override > 0) return override;
  return usdCentsToStars(priceAmountCents, DEFAULT_STARS_PER_USD_CENT);
}

export function isTestModeOn(): boolean {
  const raw = env.STARS_TEST_MODE?.toLowerCase().trim();
  return raw === 'true' || raw === '1' || raw === 'yes' || raw === 'on';
}
