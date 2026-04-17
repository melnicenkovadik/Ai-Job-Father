/**
 * Volume estimator — predicts how many suitable job postings match a campaign's filters
 * per month. Shown on Step 2 ("Deal") of the wizard as a range ±40% around the midpoint,
 * so users set realistic `target_quota` values.
 *
 * Pure function, framework-free. Coefficients are hard-coded for the MVP and tuned against
 * the existing job-hunter dataset (~2000 frontend postings/month in Europe). Later phases
 * can switch to a SQL-backed estimator against `public.jobs` once downstream populates it.
 *
 * Output is a `{ low, mid, high }` band — UI should display the band, not the midpoint,
 * to avoid over-promising.
 */

import { type JobCategory, isJobCategory } from './job-category';

export type Seniority = 'junior' | 'mid' | 'senior' | 'lead' | 'principal' | 'director';
export type WorkMode = 'remote' | 'hybrid' | 'onsite';

export interface VolumeEstimateInput {
  readonly category: JobCategory;
  /** ISO-3166-1 alpha-2 country codes; empty array ⇒ "any country". */
  readonly countries: readonly string[];
  /** At least one level; fewer levels narrow the pool. */
  readonly seniority: readonly Seniority[];
  readonly workModes: readonly WorkMode[];
  /** Number of category-specific "hard" items (tech stack count, channels, tools...). */
  readonly stackSize: number;
  /** `null` ⇒ user accepts any salary. */
  readonly minSalaryUsd: number | null;
  readonly maxPostingAgeDays: number;
}

export interface VolumeEstimate {
  readonly low: number;
  readonly mid: number;
  readonly high: number;
}

export class InvalidVolumeInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidVolumeInputError';
  }
}

/** Monthly base volume per category, tuned on job-hunter EU-remote data. */
const BASE_MONTHLY: Readonly<Record<JobCategory, number>> = {
  tech: 1500,
  design: 400,
  marketing: 600,
  sales: 800,
  product: 500,
  finance: 300,
  hr: 250,
  support: 900,
  content: 300,
  ops: 350,
  data: 600,
  web3: 180,
};

/** Country-coverage ratio — how much of the global pool is reachable.
 *  empty or contains 'any' ⇒ 1.0. Single-country heuristics are UA=0.15, etc. */
const SINGLE_COUNTRY_WEIGHT: Readonly<Record<string, number>> = {
  US: 0.55,
  GB: 0.15,
  DE: 0.14,
  FR: 0.1,
  NL: 0.07,
  ES: 0.06,
  IT: 0.05,
  PL: 0.05,
  UA: 0.03,
  IE: 0.03,
};

/** Seniority narrow ratio: 1 level = 0.25, 6 levels (all) = 1.0. Linear interp. */
function seniorityRatio(count: number): number {
  if (count <= 0) return 0;
  const clamped = Math.min(count, 6);
  return 0.25 + (clamped - 1) * ((1 - 0.25) / 5);
}

/** Work-mode ratio: remote-only = 0.4; + hybrid = 0.7; + onsite = 1.0. */
function workModeRatio(modes: readonly WorkMode[]): number {
  const set = new Set(modes);
  let r = 0;
  if (set.has('remote')) r += 0.4;
  if (set.has('hybrid')) r += 0.3;
  if (set.has('onsite')) r += 0.3;
  return Math.min(r, 1);
}

/** Stack narrow ratio: 1 hard tech = 0.3; 5 techs = 0.8 (broader = more matches). */
function stackRatio(stackSize: number): number {
  if (stackSize <= 0) return 1.0; // no filter = no narrowing
  const clamped = Math.min(stackSize, 5);
  return 0.3 + (clamped - 1) * ((0.8 - 0.3) / 4);
}

/** Posting-age ratio: 7d=0.2, 14d=0.35, 30d=0.5, 60d=0.75, 90d=1.0. */
function postingAgeRatio(days: number): number {
  if (days <= 7) return 0.2;
  if (days <= 14) return 0.35;
  if (days <= 30) return 0.5;
  if (days <= 60) return 0.75;
  return 1.0;
}

/** Salary-realism dampener: crude heuristic — unrealistic min pushes ratio to 0.2. */
function salaryRealismRatio(minSalaryUsd: number | null, category: JobCategory): number {
  if (minSalaryUsd === null) return 1.0;
  // P90-ish thresholds per category (monthly gross USD, fully-remote EU/US market).
  const p90: Readonly<Record<JobCategory, number>> = {
    tech: 12000,
    design: 8000,
    marketing: 9000,
    sales: 12000,
    product: 14000,
    finance: 11000,
    hr: 8000,
    support: 6000,
    content: 6000,
    ops: 7000,
    data: 12000,
    web3: 15000,
  };
  const threshold = p90[category];
  if (minSalaryUsd > threshold * 1.5) return 0.1;
  if (minSalaryUsd > threshold) return 0.3;
  if (minSalaryUsd > threshold * 0.7) return 0.7;
  return 1.0;
}

function countryRatio(countries: readonly string[]): number {
  if (countries.length === 0 || countries.includes('any')) return 1.0;
  const total = countries.reduce((sum, code) => {
    const upper = code.toUpperCase();
    return sum + (SINGLE_COUNTRY_WEIGHT[upper] ?? 0.02);
  }, 0);
  return Math.min(total, 1);
}

export function estimateVolume(input: VolumeEstimateInput): VolumeEstimate {
  if (!isJobCategory(input.category)) {
    throw new InvalidVolumeInputError(`Unknown category: ${String(input.category)}`);
  }
  if (input.seniority.length === 0) {
    throw new InvalidVolumeInputError('seniority must contain at least one level');
  }
  if (input.workModes.length === 0) {
    throw new InvalidVolumeInputError('workModes must contain at least one mode');
  }
  if (!Number.isFinite(input.maxPostingAgeDays) || input.maxPostingAgeDays <= 0) {
    throw new InvalidVolumeInputError(
      `maxPostingAgeDays must be positive, got ${input.maxPostingAgeDays}`,
    );
  }
  if (!Number.isFinite(input.stackSize) || input.stackSize < 0) {
    throw new InvalidVolumeInputError(`stackSize must be >= 0, got ${input.stackSize}`);
  }

  const base = BASE_MONTHLY[input.category];
  const mid =
    base *
    countryRatio(input.countries) *
    seniorityRatio(input.seniority.length) *
    workModeRatio(input.workModes) *
    stackRatio(input.stackSize) *
    salaryRealismRatio(input.minSalaryUsd, input.category) *
    postingAgeRatio(input.maxPostingAgeDays);

  return {
    low: Math.max(0, Math.round(mid * 0.6)),
    mid: Math.max(0, Math.round(mid)),
    high: Math.max(0, Math.round(mid * 1.4)),
  };
}
