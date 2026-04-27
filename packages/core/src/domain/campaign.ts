/**
 * Campaign aggregate — Wave B.
 *
 * Framework-free. Adapters hydrate via `Campaign.rehydrate`. The application
 * layer creates new drafts via `Campaign.create` (no snapshot, status='draft')
 * and walks the lifecycle using `withStatus`, `withProgress`, `withSnapshot`.
 *
 * The DB-side immutability trigger is the second line of defence — this
 * domain object is the first.
 */

import { type JobCategory, isJobCategory } from './job-category';
import {
  type CampaignStatus,
  assertTransition,
  isCampaignStatus,
  isTerminal,
} from './campaign-status';
import type { PricingBreakdown } from './pricing';
import { DomainError, UserId } from './user';

export class CampaignId {
  private constructor(public readonly value: string) {}
  static from(value: string): CampaignId {
    if (typeof value !== 'string' || value.length === 0) {
      throw new DomainError(`Invalid CampaignId: ${String(value)}`);
    }
    return new CampaignId(value);
  }
  equals(other: CampaignId): boolean {
    return this.value === other.value;
  }
}

export class CampaignValidationError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

const TITLE_MIN = 1;
const TITLE_MAX = 80;
const QUOTA_MIN = 1;
const QUOTA_MAX = 500;
const COUNTRIES_MAX = 15;

export interface CampaignProps {
  readonly id: CampaignId;
  readonly userId: UserId;
  readonly profileId: string;
  readonly title: string;
  readonly category: JobCategory;
  readonly status: CampaignStatus;
  readonly quota: number;
  readonly countries: readonly string[];
  readonly priceAmountCents: number;
  readonly priceBreakdown: PricingBreakdown;
  readonly progressFound: number;
  readonly progressApplied: number;
  readonly lastTickedAt: Date | null;
  readonly lastEventAt: Date | null;
  readonly snapshotData: Record<string, unknown> | null;
  readonly snapshotSchemaVersion: number | null;
  readonly paidAt: Date | null;
  readonly startedAt: Date | null;
  readonly completedAt: Date | null;
  readonly cancelledAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

function validateTitle(title: string): void {
  if (typeof title !== 'string' || title.length < TITLE_MIN || title.length > TITLE_MAX) {
    throw new CampaignValidationError(`title must be ${TITLE_MIN}-${TITLE_MAX} chars`);
  }
}

function validateQuota(quota: number): void {
  if (
    !Number.isFinite(quota) ||
    !Number.isInteger(quota) ||
    quota < QUOTA_MIN ||
    quota > QUOTA_MAX
  ) {
    throw new CampaignValidationError(`quota must be ${QUOTA_MIN}-${QUOTA_MAX}`);
  }
}

function validateCountries(countries: readonly string[]): void {
  if (!Array.isArray(countries)) {
    throw new CampaignValidationError('countries must be an array');
  }
  if (countries.length > COUNTRIES_MAX) {
    throw new CampaignValidationError(`countries capped at ${COUNTRIES_MAX}`);
  }
  for (const c of countries) {
    if (typeof c !== 'string' || c.length === 0 || c.length > 32) {
      throw new CampaignValidationError(`invalid country: ${String(c)}`);
    }
  }
}

export class Campaign {
  private constructor(private readonly props: CampaignProps) {}

  get id(): CampaignId {
    return this.props.id;
  }
  get userId(): UserId {
    return this.props.userId;
  }
  get profileId(): string {
    return this.props.profileId;
  }
  get title(): string {
    return this.props.title;
  }
  get category(): JobCategory {
    return this.props.category;
  }
  get status(): CampaignStatus {
    return this.props.status;
  }
  get quota(): number {
    return this.props.quota;
  }
  get countries(): readonly string[] {
    return this.props.countries;
  }
  get priceAmountCents(): number {
    return this.props.priceAmountCents;
  }
  get priceBreakdown(): PricingBreakdown {
    return this.props.priceBreakdown;
  }
  get progressFound(): number {
    return this.props.progressFound;
  }
  get progressApplied(): number {
    return this.props.progressApplied;
  }
  get lastTickedAt(): Date | null {
    return this.props.lastTickedAt;
  }
  get lastEventAt(): Date | null {
    return this.props.lastEventAt;
  }
  get snapshotData(): Record<string, unknown> | null {
    return this.props.snapshotData;
  }
  get snapshotSchemaVersion(): number | null {
    return this.props.snapshotSchemaVersion;
  }
  get paidAt(): Date | null {
    return this.props.paidAt;
  }
  get startedAt(): Date | null {
    return this.props.startedAt;
  }
  get completedAt(): Date | null {
    return this.props.completedAt;
  }
  get cancelledAt(): Date | null {
    return this.props.cancelledAt;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /**
   * Adapter helper. No business validation beyond enum + id well-formedness —
   * the row already lived in the database, so anything else would be a bug
   * upstream.
   */
  static rehydrate(props: CampaignProps): Campaign {
    if (!isCampaignStatus(props.status)) {
      throw new CampaignValidationError(`invalid status: ${String(props.status)}`);
    }
    if (!isJobCategory(props.category)) {
      throw new CampaignValidationError(`invalid category: ${String(props.category)}`);
    }
    return new Campaign(props);
  }

  /**
   * Create a fresh draft. Validates user-supplied input. Caller computes the
   * price via `priceCampaign` and passes it in (server-only — never trust the
   * client).
   */
  static create(input: {
    id: CampaignId;
    userId: UserId;
    profileId: string;
    title: string;
    category: JobCategory;
    quota: number;
    countries: readonly string[];
    priceBreakdown: PricingBreakdown;
    now: Date;
  }): Campaign {
    validateTitle(input.title);
    validateQuota(input.quota);
    validateCountries(input.countries);
    if (!isJobCategory(input.category)) {
      throw new CampaignValidationError(`invalid category: ${String(input.category)}`);
    }
    return new Campaign({
      id: input.id,
      userId: input.userId,
      profileId: input.profileId,
      title: input.title,
      category: input.category,
      status: 'draft',
      quota: input.quota,
      countries: [...input.countries],
      priceAmountCents: input.priceBreakdown.amountCents,
      priceBreakdown: input.priceBreakdown,
      progressFound: 0,
      progressApplied: 0,
      lastTickedAt: null,
      lastEventAt: null,
      snapshotData: null,
      snapshotSchemaVersion: null,
      paidAt: null,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

  withStatus(next: CampaignStatus, now: Date): Campaign {
    assertTransition(this.props.status, next);
    const ts: {
      paidAt?: Date;
      startedAt?: Date;
      completedAt?: Date;
      cancelledAt?: Date;
    } = {};
    if (next === 'paid' && !this.props.paidAt) ts.paidAt = now;
    if (next === 'searching' && !this.props.startedAt) ts.startedAt = now;
    if (next === 'completed' && !this.props.completedAt) ts.completedAt = now;
    if (next === 'cancelled' && !this.props.cancelledAt) ts.cancelledAt = now;
    return new Campaign({ ...this.props, ...ts, status: next, updatedAt: now });
  }

  withProgress(found: number, applied: number, now: Date): Campaign {
    if (
      !Number.isInteger(found) ||
      found < 0 ||
      !Number.isInteger(applied) ||
      applied < 0 ||
      applied > found
    ) {
      throw new CampaignValidationError(
        `invalid progress: found=${found}, applied=${applied} (applied must be ≤ found)`,
      );
    }
    return new Campaign({
      ...this.props,
      progressFound: found,
      progressApplied: applied,
      updatedAt: now,
    });
  }

  withSnapshot(snapshot: Record<string, unknown>, schemaVersion: number, now: Date): Campaign {
    if (this.props.status !== 'draft') {
      throw new CampaignValidationError(
        `snapshot can only be set while status='draft' (was ${this.props.status})`,
      );
    }
    return new Campaign({
      ...this.props,
      snapshotData: snapshot,
      snapshotSchemaVersion: schemaVersion,
      updatedAt: now,
    });
  }

  isTerminal(): boolean {
    return isTerminal(this.props.status);
  }
}
