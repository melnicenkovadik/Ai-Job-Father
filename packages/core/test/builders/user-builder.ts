import type { Locale } from '../../src/domain/locale';
import { TelegramId, User, UserId } from '../../src/domain/user';

const defaults = {
  id: 'u-builder',
  telegramId: 123456789,
  locale: 'en' as Locale,
  isPremium: false,
  createdAt: '2026-04-16T12:00:00.000Z',
  updatedAt: '2026-04-16T12:00:00.000Z',
};

export class UserBuilder {
  private id: string = defaults.id;
  private telegramId: number = defaults.telegramId;
  private locale: Locale = defaults.locale;
  private isPremiumFlag: boolean = defaults.isPremium;
  private username?: string;
  private firstName?: string;
  private lastName?: string;
  private timezone?: string;
  private createdAt: Date = new Date(defaults.createdAt);
  private updatedAt: Date = new Date(defaults.updatedAt);

  withId(id: string): this {
    this.id = id;
    return this;
  }

  withTelegramId(id: number): this {
    this.telegramId = id;
    return this;
  }

  withLocale(locale: Locale): this {
    this.locale = locale;
    return this;
  }

  withName(firstName: string, lastName?: string): this {
    this.firstName = firstName;
    if (lastName !== undefined) this.lastName = lastName;
    return this;
  }

  withUsername(username: string): this {
    this.username = username;
    return this;
  }

  withTimezone(tz: string): this {
    this.timezone = tz;
    return this;
  }

  premium(): this {
    this.isPremiumFlag = true;
    return this;
  }

  at(timestamp: Date | string): this {
    const d = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    this.createdAt = d;
    this.updatedAt = d;
    return this;
  }

  build(): User {
    return User.rehydrate({
      id: UserId.from(this.id),
      telegramId: TelegramId.from(this.telegramId),
      locale: this.locale,
      isPremium: this.isPremiumFlag,
      username: this.username,
      firstName: this.firstName,
      lastName: this.lastName,
      timezone: this.timezone,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    });
  }
}

export const aUser = (): UserBuilder => new UserBuilder();
