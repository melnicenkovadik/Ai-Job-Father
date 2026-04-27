import type { CampaignId } from '../domain/campaign';
import { CampaignEventFactory, type NewCampaignEvent } from '../domain/campaign-event';
import type { Payment, PaymentCurrency, PaymentProvider } from '../domain/payment';
import { DomainError, type UserId } from '../domain/user';
import type { CampaignEventRepo } from './ports/campaign-event-repo';
import type { CampaignProgressDriver } from './ports/campaign-progress-driver';
import type { CampaignRepo } from './ports/campaign-repo';
import type { PaymentRepo } from './ports/payment-repo';

export class CampaignNotPayableError extends DomainError {
  constructor(campaignId: string, status: string) {
    super(`campaign ${campaignId} is not payable (status=${status})`);
  }
}

export interface RecordPaymentInput {
  readonly userId: UserId;
  readonly campaignId: CampaignId;
  readonly provider: PaymentProvider;
  readonly providerChargeId: string;
  readonly amountCents: number;
  readonly amountProvider: number;
  readonly currency: PaymentCurrency;
  readonly snapshotData: Record<string, unknown>;
  readonly snapshotHash: string;
  readonly nonce: string;
  readonly rawEvent?: Record<string, unknown> | null | undefined;
}

export interface RecordPaymentDeps {
  readonly paymentRepo: PaymentRepo;
  readonly campaignRepo: CampaignRepo;
  readonly campaignEventRepo: CampaignEventRepo;
  /**
   * Optional. When provided, `recordPayment` calls `start(campaignId, quota)`
   * after a successful flip to `searching` so the simulator (or real
   * downstream worker) can begin producing ticks. Tests pass `undefined`.
   */
  readonly campaignProgressDriver?: CampaignProgressDriver | undefined;
}

/**
 * Atomic-from-the-caller's-POV: insert payment, flip the campaign through
 * `paid → searching`, and append `paid` + `started` events. Idempotent on
 * `(provider, providerChargeId)` — Telegram's webhook-retry semantics
 * guarantee duplicate calls; we collapse them to the first row.
 */
export async function recordPayment(
  input: RecordPaymentInput,
  deps: RecordPaymentDeps,
): Promise<Payment> {
  const existing = await deps.paymentRepo.findByProviderCharge(
    input.provider,
    input.providerChargeId,
  );
  if (existing && existing.isSucceeded()) {
    return existing;
  }

  const payment = await deps.paymentRepo.recordSucceeded({
    userId: input.userId,
    campaignId: input.campaignId,
    provider: input.provider,
    providerChargeId: input.providerChargeId,
    status: 'succeeded',
    amountCents: input.amountCents,
    amountProvider: input.amountProvider,
    currency: input.currency,
    snapshotData: input.snapshotData,
    snapshotHash: input.snapshotHash,
    nonce: input.nonce,
    rawEvent: input.rawEvent ?? null,
  });

  // Flip campaign lifecycle. The state machine inside Campaign forbids
  // jumping past 'paid' so we go in two steps.
  const campaign = await deps.campaignRepo.findById(input.campaignId);
  if (!campaign) {
    throw new CampaignNotPayableError(input.campaignId.value, 'not_found');
  }
  if (campaign.status === 'draft') {
    await deps.campaignRepo.updateStatus(input.campaignId, 'paid');
  }
  if (campaign.status === 'draft' || campaign.status === 'paid') {
    await deps.campaignRepo.updateStatus(input.campaignId, 'searching');
  }

  const events: NewCampaignEvent[] = [
    CampaignEventFactory.paid(input.campaignId, input.userId, input.amountCents),
    CampaignEventFactory.started(input.campaignId, input.userId),
  ];
  await deps.campaignEventRepo.insertMany(events);

  if (deps.campaignProgressDriver) {
    await deps.campaignProgressDriver.start(input.campaignId, campaign.quota);
  }

  return payment;
}
