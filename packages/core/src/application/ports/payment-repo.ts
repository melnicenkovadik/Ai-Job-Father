import type { CampaignId } from '../../domain/campaign';
import type {
  Payment,
  PaymentCurrency,
  PaymentProvider,
  PaymentStatus,
} from '../../domain/payment';
import type { UserId } from '../../domain/user';

export interface RecordPaymentDbInput {
  readonly userId: UserId;
  readonly campaignId: CampaignId;
  readonly provider: PaymentProvider;
  readonly providerChargeId: string;
  readonly status: PaymentStatus;
  readonly amountCents: number;
  readonly amountProvider: number;
  readonly currency: PaymentCurrency;
  readonly snapshotData: Record<string, unknown>;
  readonly snapshotHash: string;
  readonly nonce: string;
  readonly rawEvent?: Record<string, unknown> | null | undefined;
}

/**
 * PaymentRepo port — write-once persistence boundary for the Payment aggregate.
 * Adapter lives in `apps/web/lib/supabase/payment-repo.ts`.
 *
 * The `recordSucceeded` method is implemented as an idempotent UPSERT via the
 * `(provider, provider_charge_id)` UNIQUE constraint — see CLAUDE.md §8.
 */
export interface PaymentRepo {
  findByProviderCharge(
    provider: PaymentProvider,
    providerChargeId: string,
  ): Promise<Payment | null>;
  /**
   * Idempotent. On UNIQUE conflict returns the existing row instead of raising.
   */
  recordSucceeded(input: RecordPaymentDbInput): Promise<Payment>;
  recordFailed(input: RecordPaymentDbInput): Promise<Payment>;
  findByCampaignId(campaignId: CampaignId): Promise<readonly Payment[]>;
}
