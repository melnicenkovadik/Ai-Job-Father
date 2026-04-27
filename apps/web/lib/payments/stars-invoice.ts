import 'server-only';
import { getBot } from '@/lib/telegram/bot';

/**
 * Create a Telegram Stars invoice link.
 *
 * Calls Bot API `createInvoiceLink` with `currency: 'XTR'` (Stars).
 * `prices` accepts a single `LabeledPrice` whose amount is in whole Stars.
 *
 * Reference: https://core.telegram.org/bots/payments#stars
 */
export interface StarsInvoiceInput {
  title: string;
  description: string;
  payload: string;
  starsAmount: number;
}

export async function createStarsInvoiceLink(input: StarsInvoiceInput): Promise<string> {
  if (!Number.isFinite(input.starsAmount) || input.starsAmount <= 0) {
    throw new Error(`starsAmount must be > 0, got ${input.starsAmount}`);
  }
  if (input.payload.length > 128) {
    throw new Error('Stars invoice payload must be ≤ 128 chars');
  }
  const bot = getBot();
  const link = await bot.api.createInvoiceLink(
    input.title.slice(0, 32),
    input.description.slice(0, 255),
    input.payload,
    '', // provider_token — empty for Stars (XTR)
    'XTR',
    [{ label: 'Campaign', amount: input.starsAmount }],
  );
  return link;
}
