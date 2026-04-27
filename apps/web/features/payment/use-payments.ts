'use client';

import { getWebApp } from '@/components/telegram/webapp';
import { authedFetch } from '@/lib/http/authed-fetch';
import { getBrowserLogger } from '@/lib/logger';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export type PaymentProvider = 'stars' | 'ton';

export interface InitStarsResponse {
  provider: 'stars';
  invoiceLink: string;
  starsAmount: number;
  nonce: string;
}

export interface InitTonResponse {
  provider: 'ton';
}

export type InitResponse = InitStarsResponse | InitTonResponse;

async function postInit(input: {
  campaignId: string;
  provider: PaymentProvider;
}): Promise<InitResponse> {
  const res = await authedFetch('/api/payments/init', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    throw new Error(j.message ?? j.error ?? `payments_init_failed_${res.status}`);
  }
  return (await res.json()) as InitResponse;
}

export function useInitPayment() {
  return useMutation<InitResponse, Error, { campaignId: string; provider: PaymentProvider }>({
    mutationFn: postInit,
    onError: (err) => {
      getBrowserLogger().error({
        context: 'features/payment.init',
        message: err.message,
        error: err,
      });
    },
  });
}

export type StarsInvoiceStatus = 'paid' | 'cancelled' | 'failed' | 'pending';

/**
 * Open a Telegram Stars invoice and resolve when the user confirms or
 * dismisses it. Falls back to rejection if `Telegram.WebApp.openInvoice`
 * is not available (e.g. running outside Telegram).
 */
export function openStarsInvoice(invoiceLink: string): Promise<StarsInvoiceStatus> {
  return new Promise<StarsInvoiceStatus>((resolve, reject) => {
    const wa = getWebApp();
    if (!wa?.openInvoice) {
      reject(new Error('telegram_open_invoice_unavailable'));
      return;
    }
    wa.openInvoice(invoiceLink, (status) => resolve(status));
  });
}

/**
 * Hook combining `useInitPayment` and the Telegram `openInvoice` callback
 * + a campaign refetch on success. Components stay UI-thin.
 */
export function usePayWithStars() {
  const init = useInitPayment();
  const qc = useQueryClient();

  async function pay(campaignId: string): Promise<StarsInvoiceStatus> {
    const initRes = await init.mutateAsync({ campaignId, provider: 'stars' });
    if (initRes.provider !== 'stars') {
      throw new Error('unexpected_provider');
    }
    const result = await openStarsInvoice(initRes.invoiceLink);
    if (result === 'paid') {
      // Webhook is the source of truth; force a refetch so the UI catches up
      // as soon as the bot processes successful_payment.
      await qc.invalidateQueries({ queryKey: ['campaigns'] });
      await qc.invalidateQueries({ queryKey: ['campaigns', campaignId] });
    }
    return result;
  }

  return {
    pay,
    isPending: init.isPending,
    error: init.error,
    reset: init.reset,
  };
}
