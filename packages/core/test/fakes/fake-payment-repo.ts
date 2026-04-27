import type {
  PaymentRepo,
  RecordPaymentDbInput,
} from '../../src/application/ports/payment-repo';
import type { CampaignId } from '../../src/domain/campaign';
import { Payment, type PaymentProvider } from '../../src/domain/payment';
import type { Clock } from '../../src/application/ports/clock';

export class FakePaymentRepo implements PaymentRepo {
  private readonly rows = new Map<string, Payment>();
  private seq = 0;

  constructor(private readonly clock: Clock) {}

  async findByProviderCharge(
    provider: PaymentProvider,
    providerChargeId: string,
  ): Promise<Payment | null> {
    return this.rows.get(`${provider}:${providerChargeId}`) ?? null;
  }

  async findByCampaignId(campaignId: CampaignId): Promise<readonly Payment[]> {
    return [...this.rows.values()].filter((p) => p.campaignId.equals(campaignId));
  }

  async recordSucceeded(input: RecordPaymentDbInput): Promise<Payment> {
    return this.upsert(input, 'succeeded');
  }

  async recordFailed(input: RecordPaymentDbInput): Promise<Payment> {
    return this.upsert(input, 'failed');
  }

  private upsert(
    input: RecordPaymentDbInput,
    status: 'succeeded' | 'failed',
  ): Payment {
    const key = `${input.provider}:${input.providerChargeId}`;
    const existing = this.rows.get(key);
    if (existing) return existing;
    const now = this.clock.now();
    const payment = Payment.rehydrate({
      id: `pay-${++this.seq}`,
      userId: input.userId,
      campaignId: input.campaignId,
      provider: input.provider,
      providerChargeId: input.providerChargeId,
      status,
      amountCents: input.amountCents,
      amountProvider: input.amountProvider,
      currency: input.currency,
      snapshotData: input.snapshotData,
      snapshotHash: input.snapshotHash,
      nonce: input.nonce,
      rawEvent: input.rawEvent ?? null,
      createdAt: now,
      confirmedAt: status === 'succeeded' ? now : null,
    });
    this.rows.set(key, payment);
    return payment;
  }

  get size(): number {
    return this.rows.size;
  }
}
