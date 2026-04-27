'use client';

import type { JobCategory } from '@ai-job-bot/core';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/shallow';

export interface WizardDraft {
  profileId?: string;
  category?: JobCategory;
  roles: string[];
  countries: string[];
  salaryMin?: number;
  salaryCurrency: 'STARS' | 'TON' | 'USD';
  stack: string[];
  languages: string[];
  quota: number;
}

export const EMPTY_WIZARD_DRAFT: WizardDraft = {
  roles: [],
  countries: [],
  salaryCurrency: 'USD',
  stack: [],
  languages: [],
  quota: 25,
};

interface WizardState {
  step: number;
  draft: WizardDraft;
  setStep: (next: number) => void;
  patchDraft: (patch: Partial<WizardDraft>) => void;
  resetDraft: () => void;
}

/**
 * Wizard draft lives in `localStorage` so that closing/reloading the Mini App
 * mid-wizard preserves user input. The shared mock-store wizard slice is
 * removed in Wave G — until then both can coexist.
 *
 * Versioned storage key: bumping `WIZARD_STORAGE_VERSION` discards old
 * drafts on shape changes (cheap migration since the wizard only takes a
 * minute to fill out).
 */
export const WIZARD_STORAGE_VERSION = 1;

export const useWizardStore = create<WizardState>()(
  persist(
    (set) => ({
      step: 0,
      draft: { ...EMPTY_WIZARD_DRAFT },
      setStep: (next) => set({ step: Math.max(0, next) }),
      patchDraft: (patch) =>
        set((state) => ({
          draft: { ...state.draft, ...patch },
        })),
      resetDraft: () =>
        set({
          step: 0,
          draft: { ...EMPTY_WIZARD_DRAFT },
        }),
    }),
    {
      name: 'aijb:wizard:v1',
      version: WIZARD_STORAGE_VERSION,
    },
  ),
);

/**
 * Fine-grained selectors so step components don't re-render on unrelated
 * draft changes. `useWizardDraft` exposes the slice plus the mutators.
 */
export function useWizardDraft<T>(selector: (s: WizardState) => T): T {
  return useWizardStore(useShallow(selector));
}
