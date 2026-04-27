import type { UserId } from '../../domain/user';
import type { UserSettings, UserSettingsPatch } from '../../domain/user-settings';

/**
 * UserSettingsRepo port — persistence boundary for the UserSettings aggregate.
 *
 * Adapter lives in `apps/web/lib/supabase/user-settings-repo.ts`.
 * In-memory fake lives in `test/fakes/fake-user-settings-repo.ts` for use-case tests.
 */
export interface UserSettingsRepo {
  /**
   * Returns the row for this user. The DB-side seed trigger creates one on
   * user insert, so adapters should treat null as "row not found" and let
   * the use case decide whether to fall back to defaults.
   */
  findByUserId(userId: UserId): Promise<UserSettings | null>;

  /**
   * Apply a partial update. Returns the new state. Adapter is responsible
   * for setting `updated_at` to now via the DB trigger.
   */
  update(userId: UserId, patch: UserSettingsPatch): Promise<UserSettings>;
}
