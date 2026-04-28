import { env } from '../env';

/**
 * Client-side mirror of `isTestModeOn()` from `stars-amount.ts`.
 * That file is `server-only`, so the UI cannot import it. We expose the same
 * truth via the public env var `NEXT_PUBLIC_STARS_TEST_MODE` (set on Vercel
 * alongside the server-side `STARS_TEST_MODE`).
 *
 * When this returns true, checkout/payment UIs should display "1 ⭐" — same
 * amount the server-side `resolveStarsAmount()` will issue on the invoice.
 */
export function isStarsTestModeOnClient(): boolean {
  const raw = env.NEXT_PUBLIC_STARS_TEST_MODE?.toLowerCase().trim();
  return raw === 'true' || raw === '1' || raw === 'yes' || raw === 'on';
}

/**
 * Test-mode TON amount. Matches the spirit of stars-test-mode: when on, we
 * show a token-equivalent ~minimum amount so users on testnet aren't asked
 * to send real value. 0.01 TON ≈ a few cents.
 */
export const TEST_MODE_TON_AMOUNT = '0.01';
