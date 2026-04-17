import type { Profile } from '../domain/profile';
import type { ProfileRepo, SaveProfileInput, UpdateProfileInput } from './ports/profile-repo';

export interface SaveProfileDeps {
  readonly profileRepo: ProfileRepo;
}

/**
 * Upsert a profile for a user.
 *
 * Creation semantics:
 *   - First profile for a user ⇒ `is_default: true` automatically.
 *   - Subsequent profiles with `isDefault: true` demote the existing default
 *     (adapter performs the flip in the same transaction).
 *   - Omitting `isDefault` keeps the first-default rule without surprises.
 */
export async function createProfile(
  input: SaveProfileInput,
  deps: SaveProfileDeps,
): Promise<Profile> {
  return deps.profileRepo.create(input);
}

/**
 * Partial update. Omitted fields stay unchanged. Flipping `isDefault` to
 * `true` demotes any existing default for the same user.
 */
export async function updateProfile(
  input: UpdateProfileInput,
  deps: SaveProfileDeps,
): Promise<Profile> {
  return deps.profileRepo.update(input);
}

export async function deleteProfile(id: string, deps: SaveProfileDeps): Promise<void> {
  await deps.profileRepo.delete(id);
}
