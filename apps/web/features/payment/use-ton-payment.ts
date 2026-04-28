'use client';

import { authedFetch } from '@/lib/http/authed-fetch';
import { getBrowserLogger } from '@/lib/logger';
import { useQueryClient } from '@tanstack/react-query';
import { Cell, beginCell } from '@ton/core';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { useState } from 'react';

interface InitTonResponse {
  provider: 'ton';
  recipient: string;
  amountNano: string;
  comment: string;
  validUntil: number;
  nonce: string;
}

async function initTonPayment(campaignId: string): Promise<InitTonResponse> {
  const res = await authedFetch('/api/payments/init', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ campaignId, provider: 'ton' }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    throw new Error(body.message ?? body.error ?? `ton_init_failed_${res.status}`);
  }
  return (await res.json()) as InitTonResponse;
}

interface ConfirmResponse {
  status: 'recorded' | 'already_recorded';
  paymentId: string;
}

async function confirmTonPayment(input: {
  campaignId: string;
  txHash: string;
  nonce: string;
}): Promise<ConfirmResponse> {
  const res = await authedFetch('/api/payments/confirm', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    throw new Error(body.message ?? body.error ?? `ton_confirm_failed_${res.status}`);
  }
  return (await res.json()) as ConfirmResponse;
}

/**
 * Encode a text comment as a TonConnect transaction payload (BoC base64).
 * Op 0 = simple text comment (matches what TonAPI's decoded_body.text reads).
 */
function encodeCommentPayload(comment: string): string {
  const cell = beginCell().storeUint(0, 32).storeStringTail(comment).endCell();
  return cell.toBoc().toString('base64');
}

/**
 * Compute the canonical hash of a sent transaction's external message. The
 * BoC the wallet returns from `sendTransaction` is the external message that
 * TonAPI indexes under that same hash, so we can use it as our idempotency
 * key on `/api/payments/confirm`.
 */
function txHashFromBoc(boc: string): string {
  const cell = Cell.fromBase64(boc);
  return cell.hash().toString('hex');
}

const CONFIRM_RETRY_INTERVAL_MS = 3000;
const CONFIRM_MAX_ATTEMPTS = 20; // ≈60s of waiting on TonAPI to index.

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export type TonPaymentStatus = 'idle' | 'pending' | 'paid' | 'cancelled' | 'failed';

export interface PayWithTonResult {
  status: TonPaymentStatus;
  message?: string;
}

/**
 * Hook composing the full TON pay flow:
 *   - POST /api/payments/init for recipient + amount + comment + nonce
 *   - tonConnectUI.sendTransaction(...)
 *   - hash the returned BoC
 *   - poll POST /api/payments/confirm until TonAPI indexes the tx (202s while pending)
 *   - invalidate campaign queries on success
 */
export function usePayWithTon() {
  const [tonConnectUI] = useTonConnectUI();
  const qc = useQueryClient();
  const [status, setStatus] = useState<TonPaymentStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  async function pay(campaignId: string): Promise<PayWithTonResult> {
    setStatus('pending');
    setError(null);
    try {
      const init = await initTonPayment(campaignId);
      const payload = encodeCommentPayload(init.comment);

      const result = await tonConnectUI.sendTransaction({
        validUntil: init.validUntil,
        messages: [
          {
            address: init.recipient,
            amount: init.amountNano,
            payload,
          },
        ],
      });

      const txHash = txHashFromBoc(result.boc);

      let attempt = 0;
      while (attempt < CONFIRM_MAX_ATTEMPTS) {
        try {
          await confirmTonPayment({ campaignId, txHash, nonce: init.nonce });
          await qc.invalidateQueries({ queryKey: ['campaigns'] });
          await qc.invalidateQueries({ queryKey: ['campaigns', campaignId] });
          setStatus('paid');
          return { status: 'paid' };
        } catch (err) {
          const msg = (err as Error).message ?? '';
          // 202 → tx not yet indexed; keep polling.
          if (/tx_not_found/.test(msg)) {
            await sleep(CONFIRM_RETRY_INTERVAL_MS);
            attempt += 1;
            continue;
          }
          throw err;
        }
      }
      setStatus('failed');
      setError('TonAPI did not index the tx in time. Check the campaign in a minute.');
      return {
        status: 'failed',
        message: 'TonAPI did not index the tx in time. Check the campaign in a minute.',
      };
    } catch (err) {
      const message = (err as Error).message ?? 'unknown';
      // TonConnect throws a UserRejectsError when the user dismisses the wallet modal.
      const isCancel = /UserRejects|user reject/i.test(message);
      setStatus(isCancel ? 'cancelled' : 'failed');
      setError(isCancel ? null : message);
      getBrowserLogger().error({
        context: 'features/payment.ton',
        message,
        error: err,
      });
      return { status: isCancel ? 'cancelled' : 'failed', message };
    }
  }

  return { pay, status, error };
}
