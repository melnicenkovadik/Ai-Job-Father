import { describe, expect, it } from 'vitest';
import { Campaign, CampaignId, CampaignValidationError } from './campaign';
import { InvalidStatusTransitionError } from './campaign-status';
import { priceCampaign } from './pricing';
import { UserId } from './user';

const userId = UserId.from('00000000-0000-0000-0000-000000000001');
const profileId = '00000000-0000-0000-0000-000000000002';
const id = CampaignId.from('00000000-0000-0000-0000-000000000010');
const t0 = new Date('2026-04-28T10:00:00Z');
const t1 = new Date('2026-04-28T10:05:00Z');

const validBreakdown = priceCampaign({ category: 'tech', quota: 25, complexity: 'medium' });

function makeDraft(): Campaign {
  return Campaign.create({
    id,
    userId,
    profileId,
    title: 'Senior Frontend Engineer',
    category: 'tech',
    quota: 25,
    countries: ['DE', 'NL'],
    priceBreakdown: validBreakdown,
    now: t0,
  });
}

describe('Campaign.create', () => {
  it('creates a fresh draft', () => {
    const c = makeDraft();
    expect(c.status).toBe('draft');
    expect(c.priceAmountCents).toBe(validBreakdown.amountCents);
    expect(c.progressFound).toBe(0);
    expect(c.progressApplied).toBe(0);
    expect(c.snapshotData).toBeNull();
    expect(c.paidAt).toBeNull();
    expect(c.createdAt).toEqual(t0);
  });

  it('rejects empty title', () => {
    expect(() =>
      Campaign.create({
        id,
        userId,
        profileId,
        title: '',
        category: 'tech',
        quota: 25,
        countries: [],
        priceBreakdown: validBreakdown,
        now: t0,
      }),
    ).toThrow(CampaignValidationError);
  });

  it('rejects quota out of range', () => {
    expect(() =>
      Campaign.create({
        id,
        userId,
        profileId,
        title: 'X',
        category: 'tech',
        quota: 1000,
        countries: [],
        priceBreakdown: validBreakdown,
        now: t0,
      }),
    ).toThrow(CampaignValidationError);
  });

  it('rejects more than 15 countries', () => {
    const tooMany = Array.from({ length: 16 }, (_, i) => `C${i}`);
    expect(() =>
      Campaign.create({
        id,
        userId,
        profileId,
        title: 'X',
        category: 'tech',
        quota: 25,
        countries: tooMany,
        priceBreakdown: validBreakdown,
        now: t0,
      }),
    ).toThrow(CampaignValidationError);
  });
});

describe('Campaign.withStatus', () => {
  it('moves draft → paid and stamps paidAt', () => {
    const paid = makeDraft().withStatus('paid', t1);
    expect(paid.status).toBe('paid');
    expect(paid.paidAt).toEqual(t1);
    expect(paid.updatedAt).toEqual(t1);
  });

  it('rejects illegal transition draft → searching', () => {
    expect(() => makeDraft().withStatus('searching', t1)).toThrow(InvalidStatusTransitionError);
  });

  it('rejects any transition out of completed', () => {
    const completed = makeDraft()
      .withStatus('paid', t1)
      .withStatus('searching', t1)
      .withStatus('completed', t1);
    expect(() => completed.withStatus('failed', t1)).toThrow(InvalidStatusTransitionError);
  });
});

describe('Campaign.withProgress', () => {
  it('updates counters', () => {
    const c = makeDraft().withProgress(5, 2, t1);
    expect(c.progressFound).toBe(5);
    expect(c.progressApplied).toBe(2);
  });

  it('rejects applied > found', () => {
    expect(() => makeDraft().withProgress(2, 5, t1)).toThrow(CampaignValidationError);
  });
});

describe('Campaign.withSnapshot', () => {
  it('writes snapshot while draft', () => {
    const snap = { universal: { target_quota: 25 } };
    const c = makeDraft().withSnapshot(snap, 1, t1);
    expect(c.snapshotData).toEqual(snap);
    expect(c.snapshotSchemaVersion).toBe(1);
  });

  it('rejects snapshot write when not draft', () => {
    const paid = makeDraft().withStatus('paid', t1);
    expect(() => paid.withSnapshot({}, 1, t1)).toThrow(CampaignValidationError);
  });
});

describe('Campaign.rehydrate', () => {
  it('round-trips through rehydrate', () => {
    const original = makeDraft();
    const r = Campaign.rehydrate({
      id: original.id,
      userId: original.userId,
      profileId: original.profileId,
      title: original.title,
      category: original.category,
      status: original.status,
      quota: original.quota,
      countries: original.countries,
      priceAmountCents: original.priceAmountCents,
      priceBreakdown: original.priceBreakdown,
      progressFound: original.progressFound,
      progressApplied: original.progressApplied,
      lastTickedAt: original.lastTickedAt,
      lastEventAt: original.lastEventAt,
      snapshotData: original.snapshotData,
      snapshotSchemaVersion: original.snapshotSchemaVersion,
      paidAt: original.paidAt,
      startedAt: original.startedAt,
      completedAt: original.completedAt,
      cancelledAt: original.cancelledAt,
      createdAt: original.createdAt,
      updatedAt: original.updatedAt,
    });
    expect(r.title).toBe(original.title);
    expect(r.status).toBe('draft');
  });
});
