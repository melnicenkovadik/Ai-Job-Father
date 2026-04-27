import type { UserId } from '../domain/user';
import type { UserSettings } from '../domain/user-settings';
import type { UserSettingsRepo } from './ports/user-settings-repo';

export interface MarkOnboardedDeps {
  readonly userSettingsRepo: UserSettingsRepo;
}

/**
 * Mark the user as having cleared the onboarding screen. Idempotent — calling
 * twice is a no-op semantically, just an extra UPDATE that bumps `updated_at`.
 */
export async function markOnboarded(
  userId: UserId,
  deps: MarkOnboardedDeps,
): Promise<UserSettings> {
  return deps.userSettingsRepo.update(userId, { hasOnboarded: true });
}
