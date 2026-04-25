'use client';

import { enableMapSet } from 'immer';
import { createContext, useContext } from 'react';
import { type StoreApi, useStore } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { createStore } from 'zustand/vanilla';
import { EMPTY_DRAFT, SEED_CAMPAIGNS, SEED_PROFILES, SEED_SETTINGS } from './seed';
import type {
  Campaign,
  CampaignStatus,
  MockProfile,
  MockSettings,
  PaymentMethod,
  WizardDraft,
} from './types';

enableMapSet();

export interface MockState {
  campaigns: Record<string, Campaign>;
  campaignOrder: string[];
  profiles: Record<string, MockProfile>;
  profileOrder: string[];
  settings: MockSettings;
  wizard: {
    step: number;
    draft: WizardDraft;
  };
}

export interface MockActions {
  createCampaignFromDraft: (draft: WizardDraft) => Campaign;
  payCampaign: (id: string, method: PaymentMethod) => void;
  updateCampaignStatus: (id: string, status: CampaignStatus) => void;
  setStep: (next: number) => void;
  patchDraft: (patch: Partial<WizardDraft>) => void;
  resetDraft: () => void;
  setSettings: (patch: Partial<MockSettings>) => void;
  setNotification: (key: keyof MockSettings['notifications'], value: boolean) => void;
  markOnboarded: () => void;
}

export type MockStore = MockState & MockActions;

const ID_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

const randomCampaignId = (): string => {
  let out = 'c-';
  for (let i = 0; i < 4; i += 1) {
    out += ID_ALPHABET[Math.floor(Math.random() * ID_ALPHABET.length)];
  }
  return out;
};

export const computePrice = (draft: WizardDraft): { amount: number; currency: 'STARS' } => ({
  amount: 200 + draft.quota * 8 + draft.countries.length * 15,
  currency: 'STARS',
});

const CATEGORY_TITLE: Record<string, string> = {
  tech: 'Tech Specialist',
  design: 'Designer',
  marketing: 'Marketing Specialist',
  sales: 'Sales',
  product: 'Product Manager',
  finance: 'Finance Specialist',
  hr: 'HR Specialist',
  support: 'Support Specialist',
  content: 'Content Specialist',
  ops: 'Operations Specialist',
  data: 'Data Specialist',
  web3: 'Web3 Specialist',
};

const titleFromDraft = (draft: WizardDraft): string => {
  if (draft.roles[0]) return draft.roles[0];
  if (draft.category) return CATEGORY_TITLE[draft.category] ?? 'Кампания';
  return 'Новая кампания';
};

export interface CreateMockStoreOptions {
  campaigns?: readonly Campaign[];
  profiles?: readonly MockProfile[];
  settings?: MockSettings;
  draft?: WizardDraft;
}

export const createMockStore = (options: CreateMockStoreOptions = {}): StoreApi<MockStore> => {
  const seedCampaigns = options.campaigns ?? SEED_CAMPAIGNS;
  const seedProfiles = options.profiles ?? SEED_PROFILES;
  const seedSettings = options.settings ?? SEED_SETTINGS;
  const seedDraft = options.draft ?? EMPTY_DRAFT;

  const campaigns: Record<string, Campaign> = {};
  const campaignOrder: string[] = [];
  for (const c of seedCampaigns) {
    campaigns[c.id] = { ...c };
    campaignOrder.push(c.id);
  }

  const profiles: Record<string, MockProfile> = {};
  const profileOrder: string[] = [];
  for (const p of seedProfiles) {
    profiles[p.id] = { ...p };
    profileOrder.push(p.id);
  }

  return createStore<MockStore>()(
    immer((set, get) => ({
      campaigns,
      campaignOrder,
      profiles,
      profileOrder,
      settings: { ...seedSettings },
      wizard: { step: 0, draft: { ...seedDraft } },

      createCampaignFromDraft(draft) {
        const id = randomCampaignId();
        const price = computePrice(draft);
        const campaign: Campaign = {
          id,
          title: titleFromDraft(draft),
          category: draft.category ?? 'tech',
          status: 'draft',
          progress: { found: 0, applied: 0, quota: draft.quota },
          price,
          countries: [...draft.countries],
          createdAt: 'только что',
        };
        set((state) => {
          state.campaigns[id] = campaign;
          state.campaignOrder.unshift(id);
        });
        return campaign;
      },

      payCampaign(id, method) {
        set((state) => {
          const campaign = state.campaigns[id];
          if (!campaign) return;
          campaign.status = 'searching';
          campaign.paidAt = 'только что';
          campaign.price = {
            ...campaign.price,
            currency: method === 'ton' ? 'TON' : 'STARS',
          };
          campaign.events = [
            { t: 'now', kind: 'started', text: 'Поиск запущен' },
            {
              t: 'now',
              kind: 'paid',
              text: `Оплата получена · ${campaign.price.amount} ${method === 'ton' ? 'TON' : '⭐'}`,
            },
          ];
        });
      },

      updateCampaignStatus(id, status) {
        set((state) => {
          const campaign = state.campaigns[id];
          if (campaign) campaign.status = status;
        });
      },

      setStep(next) {
        set((state) => {
          state.wizard.step = Math.max(0, next);
        });
      },

      patchDraft(patch) {
        set((state) => {
          state.wizard.draft = { ...state.wizard.draft, ...patch };
        });
      },

      resetDraft() {
        set((state) => {
          state.wizard.step = 0;
          state.wizard.draft = { ...EMPTY_DRAFT };
        });
      },

      setSettings(patch) {
        set((state) => {
          state.settings = { ...state.settings, ...patch };
        });
      },

      setNotification(key, value) {
        set((state) => {
          state.settings.notifications[key] = value;
        });
      },

      markOnboarded() {
        if (get().settings.hasOnboarded) return;
        set((state) => {
          state.settings.hasOnboarded = true;
        });
      },
    })),
  );
};

export const MockStoreContext = createContext<StoreApi<MockStore> | null>(null);

export function useMockStore<T>(selector: (state: MockStore) => T): T {
  const store = useContext(MockStoreContext);
  if (!store) {
    throw new Error('useMockStore must be used inside <MockStoreProvider>');
  }
  return useStore(store, selector);
}
