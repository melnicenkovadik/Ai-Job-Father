import type { JobCategory } from '@ai-job-bot/core';

export type CampaignStatus =
  | 'draft'
  | 'pending'
  | 'paid'
  | 'running'
  | 'searching'
  | 'applying'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type EventKind = 'paid' | 'started' | 'found' | 'applied' | 'completed' | 'failed' | 'info';

export type Currency = 'STARS' | 'TON';

export type PaymentMethod = 'stars' | 'ton';

export interface CampaignProgress {
  found: number;
  applied: number;
  quota: number;
}

export interface CampaignEvent {
  t: string;
  kind: EventKind;
  text: string;
}

export interface Campaign {
  id: string;
  title: string;
  category: JobCategory;
  status: CampaignStatus;
  progress: CampaignProgress;
  price: { amount: number; currency: Currency };
  countries: string[];
  createdAt: string;
  paidAt?: string;
  events?: CampaignEvent[];
}

export interface MockProfileLanguage {
  code: string;
  label: string;
  level: string;
}

export interface MockProfileExperience {
  co: string;
  role: string;
  period: string;
}

export interface MockProfile {
  id: string;
  isDefault: boolean;
  name: string;
  headline: string;
  location: string;
  email: string;
  skills: string[];
  experience: MockProfileExperience[];
  languages: MockProfileLanguage[];
}

export type Locale = 'en' | 'uk' | 'ru' | 'it' | 'pl';

export interface MockSettings {
  locale: Locale;
  notifications: {
    push: boolean;
    email: boolean;
    weeklyDigest: boolean;
  };
  hasOnboarded: boolean;
}

/**
 * Wizard fields used by the 8-step mock wizard.
 *
 * TODO(Phase 4): align with packages/core SnapshotV1Schema (~14 fields incl.
 * salary range, seniority, role specialization). For mock-only flow we keep
 * a thinner shape so the UI doesn't leak unimplemented domain fields.
 */
export interface WizardDraft {
  profileId?: string;
  category?: JobCategory;
  roles: string[];
  countries: string[];
  salaryMin?: number;
  salaryCurrency: Currency;
  stack: string[];
  languages: string[];
  quota: number;
}
