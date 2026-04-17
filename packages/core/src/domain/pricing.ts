/**
 * Campaign pricing — pure function that maps (category, quota, complexity) → price.
 *
 * Framework-free: no currency conversion, no Stars conversion, no TON rates. Output is
 * USD cents (integer) to keep arithmetic exact and avoid float drift. Adapters downstream
 * convert to Stars / TON at checkout time using live rates.
 *
 * All multipliers live here as constants so the UI can display a breakdown and so
 * property-based tests can check monotonicity / identity / linearity.
 */

import { type JobCategory, isJobCategory } from './job-category';

export type Complexity = 'low' | 'medium' | 'high';

export const BASE_RATE_USD_CENTS_PER_APPLICATION = 50;

const CATEGORY_MULTIPLIER: Readonly<Record<JobCategory, number>> = {
  tech: 1.0,
  design: 1.1,
  marketing: 1.1,
  sales: 1.1,
  product: 1.1,
  finance: 1.15,
  hr: 1.15,
  support: 0.95,
  content: 0.95,
  ops: 0.95,
  data: 1.15,
  web3: 1.25,
};

const COMPLEXITY_MULTIPLIER: Readonly<Record<Complexity, number>> = {
  low: 0.8,
  medium: 1.0,
  high: 1.3,
};

export interface PricingInput {
  readonly category: JobCategory;
  readonly quota: number;
  readonly complexity: Complexity;
}

export interface PricingBreakdown {
  readonly baseRateCents: number;
  readonly categoryMultiplier: number;
  readonly complexityMultiplier: number;
  readonly quota: number;
  readonly amountCents: number;
}

export class InvalidPricingInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPricingInputError';
  }
}

/**
 * Compute campaign price.
 *
 *   amount_cents = round( base_rate × category_mul × complexity_mul × quota )
 *
 * Rounding: nearest integer (0.5 rounds up). The small bias vs `Math.floor` means the
 * user might pay 1 cent more on awkward quotas — acceptable given Stars charges in
 * whole-star units anyway.
 */
export function priceCampaign(input: PricingInput): PricingBreakdown {
  if (!isJobCategory(input.category)) {
    throw new InvalidPricingInputError(`Unknown category: ${String(input.category)}`);
  }
  if (!Number.isFinite(input.quota) || !Number.isInteger(input.quota) || input.quota < 0) {
    throw new InvalidPricingInputError(`quota must be a non-negative integer, got ${input.quota}`);
  }
  if (input.quota > 500) {
    throw new InvalidPricingInputError(`quota capped at 500, got ${input.quota}`);
  }
  if (!(input.complexity in COMPLEXITY_MULTIPLIER)) {
    throw new InvalidPricingInputError(`Unknown complexity: ${String(input.complexity)}`);
  }

  const categoryMultiplier = CATEGORY_MULTIPLIER[input.category];
  const complexityMultiplier = COMPLEXITY_MULTIPLIER[input.complexity];

  const raw =
    BASE_RATE_USD_CENTS_PER_APPLICATION * categoryMultiplier * complexityMultiplier * input.quota;

  return {
    baseRateCents: BASE_RATE_USD_CENTS_PER_APPLICATION,
    categoryMultiplier,
    complexityMultiplier,
    quota: input.quota,
    amountCents: Math.round(raw),
  };
}

export const PRICING_TABLE = {
  categoryMultiplier: CATEGORY_MULTIPLIER,
  complexityMultiplier: COMPLEXITY_MULTIPLIER,
  baseRateCents: BASE_RATE_USD_CENTS_PER_APPLICATION,
} as const;
