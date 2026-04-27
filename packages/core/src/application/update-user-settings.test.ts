import { beforeEach, describe, expect, it } from 'vitest';
import { FakeUserSettingsRepo, FixedClock } from '../../test/fakes';
import { UserId } from '../domain/user';
import { setUserLocale, updateUserSettings } from './update-user-settings';

const aUserId = UserId.from('00000000-0000-0000-0000-000000000001');

describe('updateUserSettings', () => {
  let clock: FixedClock;
  let repo: FakeUserSettingsRepo;

  beforeEach(() => {
    clock = new FixedClock('2026-04-28T10:00:00.000Z');
    repo = new FakeUserSettingsRepo(clock);
    repo.seed(aUserId, 'en');
  });

  it('applies a partial notifications patch', async () => {
    clock.tick(60_000);
    const updated = await updateUserSettings(
      { userId: aUserId, patch: { notifications: { push: false } } },
      { userSettingsRepo: repo, clock },
    );
    expect(updated.notifications).toEqual({ push: false, email: false, weekly: true });
    expect(updated.updatedAt.toISOString()).toBe('2026-04-28T10:01:00.000Z');
  });

  it('flips hasOnboarded', async () => {
    const updated = await updateUserSettings(
      { userId: aUserId, patch: { hasOnboarded: true } },
      { userSettingsRepo: repo, clock },
    );
    expect(updated.hasOnboarded).toBe(true);
  });

  it('rejects when no row exists for the user', async () => {
    const ghost = UserId.from('00000000-0000-0000-0000-000000000099');
    await expect(
      updateUserSettings(
        { userId: ghost, patch: { hasOnboarded: true } },
        { userSettingsRepo: repo, clock },
      ),
    ).rejects.toThrow(/missing/);
  });
});

describe('setUserLocale', () => {
  it('updates only the locale', async () => {
    const clock = new FixedClock();
    const repo = new FakeUserSettingsRepo(clock);
    repo.seed(aUserId, 'en');
    const updated = await setUserLocale(
      { userId: aUserId, locale: 'uk' },
      { userSettingsRepo: repo, clock },
    );
    expect(updated.locale).toBe('uk');
    expect(updated.notifications.push).toBe(true);
  });
});
