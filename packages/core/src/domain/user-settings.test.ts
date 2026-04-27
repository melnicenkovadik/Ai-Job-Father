import { describe, expect, it } from 'vitest';
import { InvalidLocaleError, UserId } from './user';
import { DEFAULT_NOTIFICATIONS, UserSettings } from './user-settings';

const aUserId = UserId.from('00000000-0000-0000-0000-000000000001');
const t0 = new Date('2026-04-28T10:00:00Z');
const t1 = new Date('2026-04-28T11:00:00Z');

describe('UserSettings.default', () => {
  it('seeds a fresh row with defaults', () => {
    const s = UserSettings.default(aUserId, 'ru', t0);
    expect(s.userId.value).toBe(aUserId.value);
    expect(s.locale).toBe('ru');
    expect(s.notifications).toEqual(DEFAULT_NOTIFICATIONS);
    expect(s.hasOnboarded).toBe(false);
    expect(s.createdAt).toEqual(t0);
    expect(s.updatedAt).toEqual(t0);
  });
});

describe('UserSettings.rehydrate', () => {
  it('rejects an unsupported locale', () => {
    expect(() =>
      UserSettings.rehydrate({
        userId: aUserId,
        // biome-ignore lint/suspicious/noExplicitAny: deliberate invalid input
        locale: 'fr' as any,
        notifications: DEFAULT_NOTIFICATIONS,
        hasOnboarded: false,
        createdAt: t0,
        updatedAt: t0,
      }),
    ).toThrow(InvalidLocaleError);
  });
});

describe('UserSettings.withPatch', () => {
  const initial = UserSettings.default(aUserId, 'en', t0);

  it('returns the same shape when patch is empty', () => {
    const patched = initial.withPatch({}, t1);
    expect(patched.locale).toBe('en');
    expect(patched.notifications).toEqual(DEFAULT_NOTIFICATIONS);
    expect(patched.hasOnboarded).toBe(false);
    expect(patched.updatedAt).toEqual(t1);
  });

  it('updates only locale when supplied', () => {
    const patched = initial.withPatch({ locale: 'uk' }, t1);
    expect(patched.locale).toBe('uk');
    expect(patched.notifications).toEqual(DEFAULT_NOTIFICATIONS);
  });

  it('toggles a single notification flag', () => {
    const patched = initial.withPatch({ notifications: { email: true } }, t1);
    expect(patched.notifications).toEqual({ push: true, email: true, weekly: true });
  });

  it('flips hasOnboarded', () => {
    const patched = initial.withPatch({ hasOnboarded: true }, t1);
    expect(patched.hasOnboarded).toBe(true);
  });

  it('rejects an unsupported locale in patch', () => {
    expect(() =>
      initial.withPatch(
        // biome-ignore lint/suspicious/noExplicitAny: deliberate invalid input
        { locale: 'fr' as any },
        t1,
      ),
    ).toThrow(InvalidLocaleError);
  });

  it('is pure — does not mutate the source', () => {
    initial.withPatch({ hasOnboarded: true }, t1);
    expect(initial.hasOnboarded).toBe(false);
  });
});
