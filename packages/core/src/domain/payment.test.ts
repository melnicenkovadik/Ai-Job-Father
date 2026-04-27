import { describe, expect, it } from 'vitest';
import { CampaignId } from './campaign';
import {
  PAYMENT_CURRENCIES,
  PAYMENT_PROVIDERS,
  PAYMENT_STATUSES,
  Payment,
  PaymentValidationError,
  isPaymentCurrency,
  isPaymentProvider,
  isPaymentStatus,
} from './payment';
import { UserId } from './user';

const userId = UserId.from('00000000-0000-0000-0000-000000000001');
const campaignId = CampaignId.from('00000000-0000-0000-0000-000000000010');
const t0 = new Date('2026-04-28T10:00:00Z');

function mkProps(overrides: Partial<Parameters<typeof Payment.rehydrate>[0]> = {}) {
  return {
    id: 'p-1',
    userId,
    campaignId,
    provider: 'stars' as const,
    providerChargeId: 'tg_pmt_xxx',
    status: 'succeeded' as const,
    amountCents: 1250,
    amountProvider: 625,
    currency: 'STARS' as const,
    snapshotData: { v: 1 },
    snapshotHash: 'abc',
    nonce: 'n1',
    rawEvent: null,
    createdAt: t0,
    confirmedAt: t0,
    ...overrides,
  };
}

describe('Payment enums', () => {
  it('has 2 providers', () => {
    expect(PAYMENT_PROVIDERS.length).toBe(2);
  });
  it('has 3 statuses', () => {
    expect(PAYMENT_STATUSES.length).toBe(3);
  });
  it('has 2 currencies', () => {
    expect(PAYMENT_CURRENCIES.length).toBe(2);
  });
  it('narrows', () => {
    expect(isPaymentProvider('stars')).toBe(true);
    expect(isPaymentProvider('foo')).toBe(false);
    expect(isPaymentStatus('pending')).toBe(true);
    expect(isPaymentCurrency('TON')).toBe(true);
  });
});

describe('Payment.rehydrate', () => {
  it('round-trips a succeeded payment', () => {
    const p = Payment.rehydrate(mkProps());
    expect(p.status).toBe('succeeded');
    expect(p.providerChargeId).toBe('tg_pmt_xxx');
    expect(p.isSucceeded()).toBe(true);
  });

  it('rejects empty providerChargeId', () => {
    expect(() => Payment.rehydrate(mkProps({ providerChargeId: '' }))).toThrow(
      PaymentValidationError,
    );
  });

  it('rejects unknown provider', () => {
    expect(() =>
      Payment.rehydrate(
        // biome-ignore lint/suspicious/noExplicitAny: deliberate invalid input
        mkProps({ provider: 'paypal' as any }),
      ),
    ).toThrow(PaymentValidationError);
  });
});
