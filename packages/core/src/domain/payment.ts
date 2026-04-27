/**
 * Payment aggregate — Wave D.
 *
 * Frozen at Pay-button click (CLAUDE.md §8). Once stored, only `status`
 * and `confirmed_at` move; everything else is read-only history.
 */

import type { CampaignId } from './campaign';
import { DomainError, type UserId } from './user';

export const PAYMENT_PROVIDERS = ['stars', 'ton'] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];
export function isPaymentProvider(v: unknown): v is PaymentProvider {
  return typeof v === 'string' && (PAYMENT_PROVIDERS as readonly string[]).includes(v);
}

export const PAYMENT_STATUSES = ['pending', 'succeeded', 'failed'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export function isPaymentStatus(v: unknown): v is PaymentStatus {
  return typeof v === 'string' && (PAYMENT_STATUSES as readonly string[]).includes(v);
}

export const PAYMENT_CURRENCIES = ['STARS', 'TON'] as const;
export type PaymentCurrency = (typeof PAYMENT_CURRENCIES)[number];
export function isPaymentCurrency(v: unknown): v is PaymentCurrency {
  return typeof v === 'string' && (PAYMENT_CURRENCIES as readonly string[]).includes(v);
}

export interface Money {
  readonly amountCents: number;
  readonly currency: PaymentCurrency;
}

export class PaymentValidationError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

export interface PaymentProps {
  readonly id: string;
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
  readonly rawEvent: Record<string, unknown> | null;
  readonly createdAt: Date;
  readonly confirmedAt: Date | null;
}

export class Payment {
  private constructor(private readonly props: PaymentProps) {}

  get id(): string {
    return this.props.id;
  }
  get userId(): UserId {
    return this.props.userId;
  }
  get campaignId(): CampaignId {
    return this.props.campaignId;
  }
  get provider(): PaymentProvider {
    return this.props.provider;
  }
  get providerChargeId(): string {
    return this.props.providerChargeId;
  }
  get status(): PaymentStatus {
    return this.props.status;
  }
  get amountCents(): number {
    return this.props.amountCents;
  }
  get amountProvider(): number {
    return this.props.amountProvider;
  }
  get currency(): PaymentCurrency {
    return this.props.currency;
  }
  get snapshotData(): Record<string, unknown> {
    return this.props.snapshotData;
  }
  get snapshotHash(): string {
    return this.props.snapshotHash;
  }
  get nonce(): string {
    return this.props.nonce;
  }
  get rawEvent(): Record<string, unknown> | null {
    return this.props.rawEvent;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get confirmedAt(): Date | null {
    return this.props.confirmedAt;
  }

  static rehydrate(props: PaymentProps): Payment {
    if (!isPaymentProvider(props.provider)) {
      throw new PaymentValidationError(`invalid provider: ${String(props.provider)}`);
    }
    if (!isPaymentStatus(props.status)) {
      throw new PaymentValidationError(`invalid status: ${String(props.status)}`);
    }
    if (!isPaymentCurrency(props.currency)) {
      throw new PaymentValidationError(`invalid currency: ${String(props.currency)}`);
    }
    if (props.providerChargeId.length === 0) {
      throw new PaymentValidationError('providerChargeId required');
    }
    return new Payment(props);
  }

  isSucceeded(): boolean {
    return this.props.status === 'succeeded';
  }
  isPending(): boolean {
    return this.props.status === 'pending';
  }
}
