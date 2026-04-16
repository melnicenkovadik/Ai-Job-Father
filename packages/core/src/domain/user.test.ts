import { describe, expect, it } from 'vitest';
import {
  DomainError,
  InvalidLocaleError,
  InvalidTelegramIdError,
  TelegramId,
  User,
  UserId,
} from './user';

describe('TelegramId', () => {
  it('accepts positive integers', () => {
    expect(TelegramId.from(1).value).toBe(1);
    expect(TelegramId.from(123456789).value).toBe(123456789);
  });

  it('rejects zero', () => {
    expect(() => TelegramId.from(0)).toThrow(InvalidTelegramIdError);
  });

  it('rejects negative numbers', () => {
    expect(() => TelegramId.from(-1)).toThrow(InvalidTelegramIdError);
  });

  it('rejects non-integer numbers', () => {
    expect(() => TelegramId.from(1.5)).toThrow(InvalidTelegramIdError);
  });

  it('rejects NaN and Infinity', () => {
    expect(() => TelegramId.from(Number.NaN)).toThrow(InvalidTelegramIdError);
    expect(() => TelegramId.from(Number.POSITIVE_INFINITY)).toThrow(InvalidTelegramIdError);
  });

  it('rejects values greater than Number.MAX_SAFE_INTEGER', () => {
    expect(() => TelegramId.from(Number.MAX_SAFE_INTEGER + 1)).toThrow(InvalidTelegramIdError);
  });

  it('is value-equal when wrapping the same id', () => {
    const a = TelegramId.from(777);
    const b = TelegramId.from(777);
    expect(a.equals(b)).toBe(true);
  });
});

describe('UserId', () => {
  it('accepts a non-empty string', () => {
    expect(UserId.from('c9c4d9a1-1111-2222-3333-444455556666').value).toBe(
      'c9c4d9a1-1111-2222-3333-444455556666',
    );
  });

  it('rejects empty strings', () => {
    expect(() => UserId.from('')).toThrow(DomainError);
  });
});

describe('User', () => {
  const baseNow = new Date('2026-04-16T12:00:00.000Z');

  it('requires telegramId + locale; exposes readonly fields', () => {
    const user = User.rehydrate({
      id: UserId.from('u-1'),
      telegramId: TelegramId.from(42),
      locale: 'en',
      isPremium: false,
      createdAt: baseNow,
      updatedAt: baseNow,
    });
    expect(user.id.value).toBe('u-1');
    expect(user.telegramId.value).toBe(42);
    expect(user.locale).toBe('en');
    expect(user.isPremium).toBe(false);
    expect(user.username).toBeUndefined();
  });

  it('preserves optional profile fields', () => {
    const user = User.rehydrate({
      id: UserId.from('u-2'),
      telegramId: TelegramId.from(43),
      locale: 'uk',
      isPremium: true,
      username: 'vadym',
      firstName: 'Vadym',
      lastName: 'Melnychenko',
      timezone: 'Europe/Rome',
      createdAt: baseNow,
      updatedAt: baseNow,
    });
    expect(user.username).toBe('vadym');
    expect(user.firstName).toBe('Vadym');
    expect(user.lastName).toBe('Melnychenko');
    expect(user.timezone).toBe('Europe/Rome');
    expect(user.isPremium).toBe(true);
  });

  it('throws InvalidLocaleError when constructed with an unsupported locale', () => {
    expect(() =>
      User.rehydrate({
        // biome-ignore lint/suspicious/noExplicitAny: intentional bad input in test
        locale: 'fr' as any,
        id: UserId.from('u-3'),
        telegramId: TelegramId.from(44),
        isPremium: false,
        createdAt: baseNow,
        updatedAt: baseNow,
      }),
    ).toThrow(InvalidLocaleError);
  });
});
