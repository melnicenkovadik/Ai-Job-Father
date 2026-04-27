/**
 * Campaign lifecycle state machine.
 *
 * Mirrors the `campaign_status` Postgres enum (migration 20260428000300).
 * Pure data + pure functions; no IO. The state machine is enforced both at
 * the use-case layer (via `assertTransition`) and at the database layer
 * (the snapshot immutability trigger).
 */

import { DomainError } from './user';

export const CAMPAIGN_STATUSES = [
  'draft',
  'paid',
  'searching',
  'applying',
  'completed',
  'failed',
  'cancelled',
] as const;

export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export function isCampaignStatus(value: unknown): value is CampaignStatus {
  return typeof value === 'string' && (CAMPAIGN_STATUSES as readonly string[]).includes(value);
}

/**
 * Outgoing edges for each state. Empty set ⇒ terminal.
 */
const TRANSITIONS: Readonly<Record<CampaignStatus, ReadonlySet<CampaignStatus>>> = {
  draft: new Set(['paid', 'cancelled']),
  paid: new Set(['searching', 'failed', 'cancelled']),
  searching: new Set(['applying', 'completed', 'failed', 'cancelled']),
  // Back-edge searching ↔ applying allowed so the simulator can model plateaus.
  applying: new Set(['searching', 'completed', 'failed', 'cancelled']),
  completed: new Set(),
  failed: new Set(),
  cancelled: new Set(),
};

export function canTransition(from: CampaignStatus, to: CampaignStatus): boolean {
  return TRANSITIONS[from].has(to);
}

export function isTerminal(status: CampaignStatus): boolean {
  return TRANSITIONS[status].size === 0;
}

export function isActive(status: CampaignStatus): boolean {
  return status === 'searching' || status === 'applying';
}

export class InvalidStatusTransitionError extends DomainError {
  constructor(
    public readonly from: CampaignStatus,
    public readonly to: CampaignStatus,
  ) {
    super(`Illegal campaign status transition: ${from} → ${to}`);
  }
}

export function assertTransition(from: CampaignStatus, to: CampaignStatus): void {
  if (!canTransition(from, to)) {
    throw new InvalidStatusTransitionError(from, to);
  }
}
