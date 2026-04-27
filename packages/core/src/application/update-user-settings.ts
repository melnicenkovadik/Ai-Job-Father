import type { Locale } from '../domain/locale';
import type { UserId } from '../domain/user';
import { UserSettings, type UserSettingsPatch } from '../domain/user-settings';
import type { Clock } from './ports/clock';
import type { UserSettingsRepo } from './ports/user-settings-repo';

export interface UpdateUserSettingsDeps {
  readonly userSettingsRepo: UserSettingsRepo;
  readonly clock: Clock;
}

/**
 * Apply a partial update to the user's settings row. If no row exists yet
 * (the seed trigger should always have created one, but defensive — the
 * adapter can return null after a Supabase project restore where data was
 * lost), this function rejects rather than silently materialising defaults
 * — that would mask the inconsistency.
 */
export async function updateUserSettings(
  input: { userId: UserId; patch: UserSettingsPatch },
  deps: UpdateUserSettingsDeps,
): Promise<UserSettings> {
  const existing = await deps.userSettingsRepo.findByUserId(input.userId);
  if (!existing) {
    throw new Error(`UserSettings row missing for user ${input.userId.value}`);
  }
  return deps.userSettingsRepo.update(input.userId, input.patch);
}

/**
 * Convenience: change only the locale. Used by the language switcher.
 */
export async function setUserLocale(
  input: { userId: UserId; locale: Locale },
  deps: UpdateUserSettingsDeps,
): Promise<UserSettings> {
  return updateUserSettings({ userId: input.userId, patch: { locale: input.locale } }, deps);
}
