import 'server-only';
import { DEFAULT_STARS_PER_USD_CENT, usdCentsToStars } from '@ai-job-bot/core';
import { env } from '../env';

/**
 * Stars-amount resolver shared between `/api/payments/init` (issuer) and
 * the bot's `pre_checkout_query` handler (verifier). Both paths must agree
 * — otherwise pre-checkout will reject the invoice as a price mismatch.
 *
 * If `STARS_TEST_AMOUNT` is set in env, every Stars invoice charges that
 * amount regardless of the campaign's canonical priceAmountCents. Used for
 * cheap end-to-end test runs (e.g. STARS_TEST_AMOUNT=1 → 1 ⭐).
 */
export function resolveStarsAmount(priceAmountCents: number): number {
  const override = env.STARS_TEST_AMOUNT;
  if (override !== undefined && override > 0) {
    return override;
  }
  return usdCentsToStars(priceAmountCents, DEFAULT_STARS_PER_USD_CENT);
}
