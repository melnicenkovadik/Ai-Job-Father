import { describe, expect, it } from 'vitest';
import {
  CAMPAIGN_STATUSES,
  type CampaignStatus,
  InvalidStatusTransitionError,
  assertTransition,
  canTransition,
  isActive,
  isCampaignStatus,
  isTerminal,
} from './campaign-status';

describe('CampaignStatus enum', () => {
  it('contains exactly seven states', () => {
    expect(CAMPAIGN_STATUSES.length).toBe(7);
  });

  it('isCampaignStatus narrows', () => {
    expect(isCampaignStatus('draft')).toBe(true);
    expect(isCampaignStatus('foo')).toBe(false);
    expect(isCampaignStatus(undefined)).toBe(false);
  });
});

describe('canTransition', () => {
  it('allows draft → paid and draft → cancelled', () => {
    expect(canTransition('draft', 'paid')).toBe(true);
    expect(canTransition('draft', 'cancelled')).toBe(true);
  });

  it('forbids skipping draft → searching', () => {
    expect(canTransition('draft', 'searching')).toBe(false);
  });

  it('allows searching ↔ applying for plateau realism', () => {
    expect(canTransition('searching', 'applying')).toBe(true);
    expect(canTransition('applying', 'searching')).toBe(true);
  });

  it('forbids any transition out of terminal states', () => {
    for (const terminal of ['completed', 'failed', 'cancelled'] as CampaignStatus[]) {
      for (const to of CAMPAIGN_STATUSES) {
        expect(canTransition(terminal, to)).toBe(false);
      }
    }
  });

  it('forbids self-transition (draft → draft etc.)', () => {
    for (const s of CAMPAIGN_STATUSES) {
      expect(canTransition(s, s)).toBe(false);
    }
  });
});

describe('isTerminal / isActive', () => {
  it('marks completed/failed/cancelled as terminal', () => {
    expect(isTerminal('completed')).toBe(true);
    expect(isTerminal('failed')).toBe(true);
    expect(isTerminal('cancelled')).toBe(true);
  });
  it('marks searching/applying as active', () => {
    expect(isActive('searching')).toBe(true);
    expect(isActive('applying')).toBe(true);
    expect(isActive('paid')).toBe(false);
  });
});

describe('assertTransition', () => {
  it('throws InvalidStatusTransitionError on illegal edges', () => {
    expect(() => assertTransition('draft', 'searching')).toThrow(InvalidStatusTransitionError);
  });
  it('passes silently on legal edges', () => {
    expect(() => assertTransition('paid', 'searching')).not.toThrow();
  });
});
