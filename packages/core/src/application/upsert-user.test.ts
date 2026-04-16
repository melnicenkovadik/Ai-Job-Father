import { beforeEach, describe, expect, it } from 'vitest';
import { FakeUserRepo, FixedClock } from '../../test/fakes';
import { upsertUser } from './upsert-user';

describe('upsertUser', () => {
  let clock: FixedClock;
  let repo: FakeUserRepo;

  beforeEach(() => {
    clock = new FixedClock('2026-04-16T12:00:00.000Z');
    repo = new FakeUserRepo(clock);
  });

  it('creates a new user with locale detected from language_code', async () => {
    const user = await upsertUser(
      {
        telegramId: 111,
        languageCode: 'uk-UA',
        firstName: 'Vadym',
        isPremium: false,
      },
      { userRepo: repo },
    );

    expect(user.locale).toBe('uk');
    expect(user.telegramId.value).toBe(111);
    expect(user.firstName).toBe('Vadym');
    expect(repo.size).toBe(1);
  });

  it("keeps the user's original locale on returning upsert (auto-detect is first-/start only)", async () => {
    const first = await upsertUser(
      { telegramId: 111, languageCode: 'uk', isPremium: false },
      { userRepo: repo },
    );
    expect(first.locale).toBe('uk');

    const second = await upsertUser(
      {
        telegramId: 111,
        languageCode: 'ru',
        firstName: 'Changed',
        isPremium: false,
      },
      { userRepo: repo },
    );
    expect(second.locale).toBe('uk');
    expect(second.firstName).toBe('Changed');
    expect(second.id.equals(first.id)).toBe(true);
  });

  it("falls back to 'en' for unsupported language_code on first upsert", async () => {
    const user = await upsertUser(
      { telegramId: 222, languageCode: 'fr', isPremium: false },
      { userRepo: repo },
    );
    expect(user.locale).toBe('en');
  });

  it("falls back to 'en' when language_code is undefined", async () => {
    const user = await upsertUser({ telegramId: 333, isPremium: false }, { userRepo: repo });
    expect(user.locale).toBe('en');
  });

  it('updates isPremium on subsequent upsert', async () => {
    await upsertUser({ telegramId: 444, isPremium: false }, { userRepo: repo });
    const upgraded = await upsertUser({ telegramId: 444, isPremium: true }, { userRepo: repo });
    expect(upgraded.isPremium).toBe(true);
  });

  it('rejects invalid telegramId via domain validation', async () => {
    await expect(
      upsertUser({ telegramId: 0, isPremium: false }, { userRepo: repo }),
    ).rejects.toThrow();
  });

  it('passes through optional profile fields', async () => {
    const user = await upsertUser(
      {
        telegramId: 555,
        username: 'melnicenkovadik',
        firstName: 'Vadym',
        lastName: 'M.',
        timezone: 'Europe/Rome',
        isPremium: true,
        languageCode: 'it-IT',
      },
      { userRepo: repo },
    );
    expect(user.username).toBe('melnicenkovadik');
    expect(user.firstName).toBe('Vadym');
    expect(user.lastName).toBe('M.');
    expect(user.timezone).toBe('Europe/Rome');
    expect(user.isPremium).toBe(true);
    expect(user.locale).toBe('it');
  });
});
