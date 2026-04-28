import 'server-only';

/**
 * Invoice payload format. Two shapes coexist:
 *
 *   Legacy / campaign: `aijb:{campaignId}:{nonce}`           (3 parts)
 *   AI-parse credit:   `aijb:ai:{userId}:{nonce}`            (4 parts, prefix 'ai')
 *
 * Decoder accepts both. The 3-part form is implicitly campaign so existing
 * in-flight TON tx-comments and Stars invoices keep working without
 * coordinated cutover.
 *
 * The bot webhook reads the result and routes:
 *   purpose='campaign'  → mark campaigns.status='paid', start simulator.
 *   purpose='ai_parse'  → insert ai_credits row (one consumable AI parse).
 */

export const PAYLOAD_PREFIX = 'aijb';

export type PaymentPurpose = 'campaign' | 'ai_parse';

export interface CampaignPayload {
  purpose: 'campaign';
  campaignId: string;
  nonce: string;
}

export interface AiParsePayload {
  purpose: 'ai_parse';
  userId: string;
  nonce: string;
}

export type PaymentPayload = CampaignPayload | AiParsePayload;

/**
 * Encodes a campaign payload in the legacy 3-part shape — preserves
 * compatibility with already-issued TON tx-comments / Stars invoices.
 */
export function encodePayload(p: { campaignId: string; nonce: string }): string {
  return `${PAYLOAD_PREFIX}:${p.campaignId}:${p.nonce}`;
}

/** Encodes an AI-parse credit payload in the 4-part shape. */
export function encodeAiParsePayload(p: { userId: string; nonce: string }): string {
  return `${PAYLOAD_PREFIX}:ai:${p.userId}:${p.nonce}`;
}

export function decodePayload(raw: string): PaymentPayload | null {
  if (typeof raw !== 'string') return null;
  const parts = raw.split(':');
  if (parts[0] !== PAYLOAD_PREFIX) return null;

  // Legacy 3-part: aijb:{campaignId}:{nonce}
  if (parts.length === 3) {
    const campaignId = parts[1];
    const nonce = parts[2];
    if (!campaignId || !nonce) return null;
    return { purpose: 'campaign', campaignId, nonce };
  }

  // 4-part: aijb:{purposeCode}:{id}:{nonce}
  if (parts.length === 4) {
    const code = parts[1];
    const id = parts[2];
    const nonce = parts[3];
    if (!id || !nonce) return null;
    if (code === 'c') return { purpose: 'campaign', campaignId: id, nonce };
    if (code === 'ai') return { purpose: 'ai_parse', userId: id, nonce };
  }
  return null;
}

/** Generate a 16-char hex nonce. Sufficient for collision avoidance. */
export function generateNonce(): string {
  const buf = new Uint8Array(8);
  crypto.getRandomValues(buf);
  return [...buf].map((b) => b.toString(16).padStart(2, '0')).join('');
}
