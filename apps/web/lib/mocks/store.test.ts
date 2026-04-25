import { describe, expect, it } from 'vitest';
import { computePrice, createMockStore } from './store';
import type { WizardDraft } from './types';

const draft = (patch: Partial<WizardDraft> = {}): WizardDraft => ({
  roles: ['Senior Engineer'],
  countries: ['DE', 'NL'],
  category: 'tech',
  salaryCurrency: 'STARS',
  stack: ['TypeScript'],
  languages: ['EN'],
  quota: 25,
  ...patch,
});

describe('mock store', () => {
  it('seeds campaigns from defaults', () => {
    const store = createMockStore();
    const { campaignOrder, campaigns } = store.getState();
    expect(campaignOrder.length).toBeGreaterThan(0);
    for (const id of campaignOrder) {
      expect(campaigns[id]).toBeDefined();
    }
  });

  it('createCampaignFromDraft prepends a draft campaign', () => {
    const store = createMockStore();
    const before = store.getState().campaignOrder.length;
    const campaign = store.getState().createCampaignFromDraft(draft({ quota: 30 }));
    const { campaignOrder, campaigns } = store.getState();
    expect(campaignOrder).toHaveLength(before + 1);
    expect(campaignOrder[0]).toBe(campaign.id);
    expect(campaigns[campaign.id]?.status).toBe('draft');
    expect(campaigns[campaign.id]?.progress.quota).toBe(30);
    expect(campaigns[campaign.id]?.title).toBe('Senior Engineer');
  });

  it('computePrice reflects quota and country count', () => {
    expect(computePrice(draft({ quota: 25, countries: ['DE', 'NL'] }))).toEqual({
      amount: 200 + 25 * 8 + 2 * 15,
      currency: 'STARS',
    });
  });

  it('payCampaign moves draft to searching and records events', () => {
    const store = createMockStore();
    const campaign = store.getState().createCampaignFromDraft(draft());
    store.getState().payCampaign(campaign.id, 'stars');
    const after = store.getState().campaigns[campaign.id];
    expect(after?.status).toBe('searching');
    expect(after?.paidAt).toBeDefined();
    expect(after?.events?.length).toBeGreaterThanOrEqual(2);
  });

  it('patchDraft + resetDraft round trip', () => {
    const store = createMockStore();
    store.getState().patchDraft({ quota: 50, countries: ['UK'] });
    expect(store.getState().wizard.draft.quota).toBe(50);
    store.getState().resetDraft();
    expect(store.getState().wizard.draft.quota).toBe(25);
    expect(store.getState().wizard.step).toBe(0);
  });

  it('toggles notifications and onboarded flag', () => {
    const store = createMockStore();
    store.getState().setNotification('push', false);
    expect(store.getState().settings.notifications.push).toBe(false);
    store.getState().markOnboarded();
    expect(store.getState().settings.hasOnboarded).toBe(true);
  });
});
