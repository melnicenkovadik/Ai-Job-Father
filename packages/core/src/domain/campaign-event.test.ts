import { describe, expect, it } from 'vitest';
import { CampaignId } from './campaign';
import {
  CAMPAIGN_EVENT_KINDS,
  CampaignEvent,
  CampaignEventFactory,
  CampaignEventValidationError,
  isCampaignEventKind,
  validateNewCampaignEvent,
} from './campaign-event';
import { UserId } from './user';

const cid = CampaignId.from('00000000-0000-0000-0000-000000000010');
const uid = UserId.from('00000000-0000-0000-0000-000000000001');

describe('CampaignEventKind', () => {
  it('contains 7 kinds', () => {
    expect(CAMPAIGN_EVENT_KINDS.length).toBe(7);
  });
  it('isCampaignEventKind narrows', () => {
    expect(isCampaignEventKind('paid')).toBe(true);
    expect(isCampaignEventKind('foo')).toBe(false);
  });
});

describe('CampaignEventFactory', () => {
  it('paid emits an event with USD-formatted text', () => {
    const e = CampaignEventFactory.paid(cid, uid, 1234);
    expect(e.kind).toBe('paid');
    expect(e.text).toContain('12.34');
  });
  it('found includes company + count in data', () => {
    const e = CampaignEventFactory.found(cid, uid, 'Notion', 8);
    expect(e.kind).toBe('found');
    expect(e.text).toBe('Found 8 matches · Notion');
    expect(e.data).toEqual({ company: 'Notion', count: 8 });
  });
  it('truncates info text to 200 chars', () => {
    const longText = 'x'.repeat(500);
    const e = CampaignEventFactory.info(cid, uid, longText);
    expect(e.text.length).toBe(200);
  });
});

describe('validateNewCampaignEvent', () => {
  it('rejects empty text', () => {
    expect(() =>
      validateNewCampaignEvent({ campaignId: cid, userId: uid, kind: 'info', text: '' }),
    ).toThrow(CampaignEventValidationError);
  });
  it('rejects unknown kind', () => {
    expect(() =>
      validateNewCampaignEvent({
        campaignId: cid,
        userId: uid,
        // biome-ignore lint/suspicious/noExplicitAny: invalid input
        kind: 'foo' as any,
        text: 'ok',
      }),
    ).toThrow(CampaignEventValidationError);
  });
});

describe('CampaignEvent.rehydrate', () => {
  it('round-trips', () => {
    const e = CampaignEvent.rehydrate({
      id: 'e1',
      campaignId: cid,
      userId: uid,
      kind: 'applied',
      text: 'Applied · Klarna',
      createdAt: new Date('2026-04-28T10:00:00Z'),
    });
    expect(e.kind).toBe('applied');
    expect(e.id).toBe('e1');
  });
});
