import type { Campaign } from '../domain/campaign';
import type { JobCategory } from '../domain/job-category';
import { type Complexity, priceCampaign } from '../domain/pricing';
import { DomainError, UserId } from '../domain/user';
import type { Clock } from './ports/clock';
import type { CampaignRepo } from './ports/campaign-repo';
import type { ProfileRepo } from './ports/profile-repo';

export interface CreateCampaignInput {
  readonly userId: UserId;
  readonly profileId: string;
  readonly title: string;
  readonly category: JobCategory;
  readonly quota: number;
  readonly countries: readonly string[];
  /** Defaults to `'medium'` if not supplied — the wizard does not collect this yet (Wave C). */
  readonly complexity?: Complexity | undefined;
}

export interface CreateCampaignDeps {
  readonly campaignRepo: CampaignRepo;
  readonly profileRepo: ProfileRepo;
  readonly clock: Clock;
}

export class ProfileOwnershipError extends DomainError {
  constructor(profileId: string, userId: string) {
    super(`profile ${profileId} is not owned by user ${userId}`);
  }
}

/**
 * Build a draft campaign and persist it. Server-side recompute of price via
 * the canonical `priceCampaign` — never trust the client's number.
 *
 * Caller is responsible for verifying initData; this function trusts that
 * `input.userId` is the authenticated principal.
 */
export async function createCampaign(
  input: CreateCampaignInput,
  deps: CreateCampaignDeps,
): Promise<Campaign> {
  const profile = await deps.profileRepo.findById(input.profileId);
  if (!profile || profile.userId !== input.userId.value) {
    throw new ProfileOwnershipError(input.profileId, input.userId.value);
  }
  const breakdown = priceCampaign({
    category: input.category,
    quota: input.quota,
    complexity: input.complexity ?? 'medium',
  });
  return deps.campaignRepo.create({
    userId: input.userId,
    profileId: input.profileId,
    title: input.title,
    category: input.category,
    quota: input.quota,
    countries: input.countries,
    priceBreakdown: breakdown,
  });
}
