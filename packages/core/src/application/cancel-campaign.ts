import { type Campaign, type CampaignId } from '../domain/campaign';
import { DomainError, type UserId } from '../domain/user';
import type { CampaignRepo } from './ports/campaign-repo';

export class CampaignNotFoundError extends DomainError {
  constructor(id: string) {
    super(`Campaign not found: ${id}`);
  }
}

export class CampaignOwnershipError extends DomainError {
  constructor(id: string, userId: string) {
    super(`Campaign ${id} is not owned by user ${userId}`);
  }
}

export interface CancelCampaignDeps {
  readonly campaignRepo: CampaignRepo;
}

/**
 * Flip a campaign to 'cancelled'. The state machine guarantees the source
 * status allowed the transition (terminal states throw upstream).
 *
 * Idempotent: cancelling an already-cancelled campaign returns the same row
 * without raising.
 */
export async function cancelCampaign(
  input: { id: CampaignId; userId: UserId },
  deps: CancelCampaignDeps,
): Promise<Campaign> {
  const existing = await deps.campaignRepo.findById(input.id);
  if (!existing) {
    throw new CampaignNotFoundError(input.id.value);
  }
  if (!existing.userId.equals(input.userId)) {
    throw new CampaignOwnershipError(input.id.value, input.userId.value);
  }
  if (existing.status === 'cancelled') {
    return existing;
  }
  return deps.campaignRepo.updateStatus(input.id, 'cancelled');
}
