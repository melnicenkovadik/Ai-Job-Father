import type { UserSettingsRepo } from '../../src/application/ports/user-settings-repo';
import type { Clock } from '../../src/application/ports/clock';
import type { UserId } from '../../src/domain/user';
import { UserSettings, type UserSettingsPatch } from '../../src/domain/user-settings';

/**
 * In-memory fake for use-case tests. Mirrors the row that the DB seed
 * trigger would have created — call `seed(userId, locale)` to set up the
 * initial row before exercising a use case.
 */
export class FakeUserSettingsRepo implements UserSettingsRepo {
  private readonly byUserId = new Map<string, UserSettings>();

  constructor(private readonly clock: Clock) {}

  seed(userId: UserId, locale: 'en' | 'uk' | 'ru' | 'it' | 'pl'): UserSettings {
    const settings = UserSettings.default(userId, locale, this.clock.now());
    this.byUserId.set(userId.value, settings);
    return settings;
  }

  async findByUserId(userId: UserId): Promise<UserSettings | null> {
    return this.byUserId.get(userId.value) ?? null;
  }

  async update(userId: UserId, patch: UserSettingsPatch): Promise<UserSettings> {
    const existing = this.byUserId.get(userId.value);
    if (!existing) {
      throw new Error(`UserSettings row missing for user ${userId.value}`);
    }
    const next = existing.withPatch(patch, this.clock.now());
    this.byUserId.set(userId.value, next);
    return next;
  }

  get size(): number {
    return this.byUserId.size;
  }
}
