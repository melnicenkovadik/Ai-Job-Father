import 'server-only';
import { Address } from '@ton/core';
import { env } from '../env';

/**
 * On-chain verifier for TON payments. Wave E.
 *
 * Frontend hands us the BoC hash of the transaction the user signed via
 * TonConnect. We poll TonAPI until it shows up (typical lag is 5-20s after
 * broadcast), then verify recipient + amount + comment payload + success.
 *
 * Free tier of TonAPI rate-limits to ~1 req/sec. We retry 3× with 2s backoff;
 * if the tx still isn't indexed, we surface "tx_not_found" to the client and
 * trust them to retry the confirm POST after a short delay.
 *
 * Reference: https://docs.tonapi.io/api/v2/blockchain
 */

export class TonVerificationError extends Error {
  constructor(
    public readonly code: TonVerificationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'TonVerificationError';
  }
}

export type TonVerificationErrorCode =
  | 'tx_not_found'
  | 'recipient_mismatch'
  | 'amount_mismatch'
  | 'comment_mismatch'
  | 'tx_failed'
  | 'tonapi_unreachable'
  | 'config_missing';

interface TonApiTransaction {
  hash: string;
  success: boolean;
  out_msgs: Array<{
    destination?: { address?: string };
    value?: string | number;
    decoded_body?: { text?: string } | null;
    decoded_op_name?: string;
  }>;
  in_msg?: {
    destination?: { address?: string };
    value?: string | number;
    decoded_body?: { text?: string } | null;
  };
}

function tonApiBase(): string {
  return env.TON_NETWORK === 'mainnet' ? 'https://tonapi.io' : 'https://testnet.tonapi.io';
}

async function fetchTransaction(txHash: string): Promise<TonApiTransaction | null> {
  const url = `${tonApiBase()}/v2/blockchain/transactions/${encodeURIComponent(txHash)}`;
  const headers: Record<string, string> = { accept: 'application/json' };
  if (env.TON_API_KEY) headers.authorization = `Bearer ${env.TON_API_KEY}`;
  let res: Response;
  try {
    res = await fetch(url, { headers });
  } catch (err) {
    throw new TonVerificationError(
      'tonapi_unreachable',
      `TonAPI fetch failed: ${(err as Error).message}`,
    );
  }
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new TonVerificationError('tonapi_unreachable', `TonAPI returned ${res.status}`);
  }
  return (await res.json()) as TonApiTransaction;
}

function normalizeAddr(raw: string): string {
  try {
    return Address.parse(raw).toString({ urlSafe: true, bounceable: false });
  } catch {
    return raw;
  }
}

export interface VerifyTonInput {
  txHash: string;
  expectedRecipient: string;
  expectedAmountNano: bigint;
  expectedComment: string;
}

export interface VerifyTonResult {
  amountNano: bigint;
  recipient: string;
  comment: string;
  raw: TonApiTransaction;
}

const RETRY_COUNT = 3;
const RETRY_DELAY_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function verifyTonTransaction(input: VerifyTonInput): Promise<VerifyTonResult> {
  if (!env.TON_PAYMENT_RECIPIENT_ADDRESS) {
    throw new TonVerificationError('config_missing', 'TON_PAYMENT_RECIPIENT_ADDRESS not set');
  }

  let tx: TonApiTransaction | null = null;
  let lastErr: TonVerificationError | null = null;
  for (let attempt = 0; attempt < RETRY_COUNT; attempt += 1) {
    try {
      tx = await fetchTransaction(input.txHash);
      if (tx) break;
    } catch (err) {
      lastErr = err as TonVerificationError;
    }
    if (attempt < RETRY_COUNT - 1) await sleep(RETRY_DELAY_MS);
  }
  if (!tx) {
    throw lastErr ?? new TonVerificationError('tx_not_found', 'tx not indexed yet');
  }

  if (!tx.success) {
    throw new TonVerificationError('tx_failed', 'transaction failed on-chain');
  }

  // The user paid us — i.e. there is exactly one outgoing message from the
  // user's wallet whose destination is our recipient address. Some wallets
  // send the tx as the user's own external in_msg; the value movement we
  // care about is the outbound message to the recipient.
  const expected = normalizeAddr(input.expectedRecipient);
  const recipientMsg = tx.out_msgs.find(
    (m) => m.destination?.address && normalizeAddr(m.destination.address) === expected,
  );
  if (!recipientMsg) {
    throw new TonVerificationError(
      'recipient_mismatch',
      `no outgoing message to expected recipient ${expected}`,
    );
  }
  const valueRaw = recipientMsg.value ?? '0';
  const amountNano = BigInt(typeof valueRaw === 'number' ? Math.round(valueRaw) : valueRaw);
  if (amountNano < input.expectedAmountNano) {
    throw new TonVerificationError(
      'amount_mismatch',
      `expected ≥ ${input.expectedAmountNano} nano, got ${amountNano}`,
    );
  }
  const comment = recipientMsg.decoded_body?.text ?? '';
  if (comment.trim() !== input.expectedComment.trim()) {
    throw new TonVerificationError(
      'comment_mismatch',
      `expected comment ${JSON.stringify(input.expectedComment)}, got ${JSON.stringify(comment)}`,
    );
  }

  return {
    amountNano,
    recipient: expected,
    comment,
    raw: tx,
  };
}
