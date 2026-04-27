import 'server-only';

/**
 * Invoice payload format: `aijb:{campaignId}:{nonce}`.
 *
 * The bot webhook decodes this in pre_checkout_query and successful_payment
 * handlers to recover the campaign + idempotency nonce. The same shape is
 * used as the TON-tx comment so both flows share a single decoder.
 */

export const PAYLOAD_PREFIX = 'aijb';

export interface PaymentPayload {
  campaignId: string;
  nonce: string;
}

export function encodePayload(p: PaymentPayload): string {
  return `${PAYLOAD_PREFIX}:${p.campaignId}:${p.nonce}`;
}

export function decodePayload(raw: string): PaymentPayload | null {
  if (typeof raw !== 'string') return null;
  const parts = raw.split(':');
  if (parts.length !== 3 || parts[0] !== PAYLOAD_PREFIX) return null;
  const campaignId = parts[1];
  const nonce = parts[2];
  if (!campaignId || !nonce) return null;
  return { campaignId, nonce };
}

/** Generate a 16-char hex nonce. Sufficient for collision avoidance. */
export function generateNonce(): string {
  // crypto is available on Node 18+ and Edge.
  const buf = new Uint8Array(8);
  crypto.getRandomValues(buf);
  return [...buf].map((b) => b.toString(16).padStart(2, '0')).join('');
}
