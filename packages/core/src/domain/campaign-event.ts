/**
 * CampaignEvent — append-only timeline entry for a campaign. Mirrors the
 * Postgres `campaign_event_kind` enum and `campaign_events` table.
 */

import { CampaignId } from './campaign';
import { DomainError, UserId } from './user';

export const CAMPAIGN_EVENT_KINDS = [
  'paid',
  'started',
  'found',
  'applied',
  'completed',
  'failed',
  'info',
] as const;

export type CampaignEventKind = (typeof CAMPAIGN_EVENT_KINDS)[number];

export function isCampaignEventKind(value: unknown): value is CampaignEventKind {
  return typeof value === 'string' && (CAMPAIGN_EVENT_KINDS as readonly string[]).includes(value);
}

export class CampaignEventValidationError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

const TEXT_MIN = 1;
const TEXT_MAX = 200;

export interface NewCampaignEvent {
  readonly campaignId: CampaignId;
  readonly userId: UserId;
  readonly kind: CampaignEventKind;
  readonly text: string;
  readonly data?: Record<string, unknown> | undefined;
}

export interface CampaignEventProps extends NewCampaignEvent {
  readonly id: string;
  readonly createdAt: Date;
}

export class CampaignEvent {
  private constructor(private readonly props: CampaignEventProps) {}

  get id(): string {
    return this.props.id;
  }
  get campaignId(): CampaignId {
    return this.props.campaignId;
  }
  get userId(): UserId {
    return this.props.userId;
  }
  get kind(): CampaignEventKind {
    return this.props.kind;
  }
  get text(): string {
    return this.props.text;
  }
  get data(): Record<string, unknown> | undefined {
    return this.props.data;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  static rehydrate(props: CampaignEventProps): CampaignEvent {
    if (!isCampaignEventKind(props.kind)) {
      throw new CampaignEventValidationError(`invalid kind: ${String(props.kind)}`);
    }
    if (
      typeof props.text !== 'string' ||
      props.text.length < TEXT_MIN ||
      props.text.length > TEXT_MAX
    ) {
      throw new CampaignEventValidationError(`text must be ${TEXT_MIN}-${TEXT_MAX} chars`);
    }
    return new CampaignEvent(props);
  }
}

/** Validate a NewCampaignEvent payload before persisting. */
export function validateNewCampaignEvent(input: NewCampaignEvent): void {
  if (!isCampaignEventKind(input.kind)) {
    throw new CampaignEventValidationError(`invalid kind: ${String(input.kind)}`);
  }
  if (
    typeof input.text !== 'string' ||
    input.text.length < TEXT_MIN ||
    input.text.length > TEXT_MAX
  ) {
    throw new CampaignEventValidationError(`text must be ${TEXT_MIN}-${TEXT_MAX} chars`);
  }
}

/**
 * Convenience factories. Producing well-formed text strings here keeps the
 * call-sites (record-payment use case, simulator driver) tiny.
 */
export const CampaignEventFactory = {
  paid(campaignId: CampaignId, userId: UserId, amountCents: number): NewCampaignEvent {
    return {
      campaignId,
      userId,
      kind: 'paid',
      text: `Payment received · ${(amountCents / 100).toFixed(2)} USD`,
      data: { amountCents },
    };
  },
  started(campaignId: CampaignId, userId: UserId): NewCampaignEvent {
    return {
      campaignId,
      userId,
      kind: 'started',
      text: 'Search started',
    };
  },
  found(
    campaignId: CampaignId,
    userId: UserId,
    company: string,
    count: number,
  ): NewCampaignEvent {
    return {
      campaignId,
      userId,
      kind: 'found',
      text: `Found ${count} matches · ${company}`,
      data: { company, count },
    };
  },
  applied(campaignId: CampaignId, userId: UserId, company: string): NewCampaignEvent {
    return {
      campaignId,
      userId,
      kind: 'applied',
      text: `Applied · ${company}`,
      data: { company },
    };
  },
  completed(campaignId: CampaignId, userId: UserId, applied: number): NewCampaignEvent {
    return {
      campaignId,
      userId,
      kind: 'completed',
      text: `Campaign complete · ${applied} applications sent`,
      data: { applied },
    };
  },
  failed(campaignId: CampaignId, userId: UserId, reason: string): NewCampaignEvent {
    return {
      campaignId,
      userId,
      kind: 'failed',
      text: `Campaign failed: ${reason}`.slice(0, TEXT_MAX),
      data: { reason },
    };
  },
  info(campaignId: CampaignId, userId: UserId, text: string): NewCampaignEvent {
    return {
      campaignId,
      userId,
      kind: 'info',
      text: text.slice(0, TEXT_MAX),
    };
  },
};
