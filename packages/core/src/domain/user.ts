/**
 * User aggregate — domain entity for Phase 1 auth.
 *
 * Framework-free: no Supabase, no Next, no React. Consumers (adapters) hydrate `User`
 * via `User.rehydrate(...)` after loading rows or verifying initData.
 */

import { isLocale, type Locale } from './locale';

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidTelegramIdError extends DomainError {
  constructor(value: unknown) {
    super(`Invalid Telegram id: ${String(value)}`);
  }
}

export class InvalidLocaleError extends DomainError {
  constructor(value: unknown) {
    super(`Invalid locale: ${String(value)}`);
  }
}

export class TelegramId {
  private constructor(public readonly value: number) {}

  static from(value: number): TelegramId {
    if (
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      !Number.isInteger(value) ||
      value <= 0 ||
      value > Number.MAX_SAFE_INTEGER
    ) {
      throw new InvalidTelegramIdError(value);
    }
    return new TelegramId(value);
  }

  equals(other: TelegramId): boolean {
    return this.value === other.value;
  }
}

export class UserId {
  private constructor(public readonly value: string) {}

  static from(value: string): UserId {
    if (typeof value !== 'string' || value.length === 0) {
      throw new DomainError(`Invalid UserId: ${String(value)}`);
    }
    return new UserId(value);
  }

  equals(other: UserId): boolean {
    return this.value === other.value;
  }
}

export interface UserState {
  readonly id: UserId;
  readonly telegramId: TelegramId;
  readonly locale: Locale;
  readonly isPremium: boolean;
  readonly username?: string | undefined;
  readonly firstName?: string | undefined;
  readonly lastName?: string | undefined;
  readonly timezone?: string | undefined;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export class User implements UserState {
  readonly id: UserId;
  readonly telegramId: TelegramId;
  readonly locale: Locale;
  readonly isPremium: boolean;
  readonly username?: string | undefined;
  readonly firstName?: string | undefined;
  readonly lastName?: string | undefined;
  readonly timezone?: string | undefined;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(state: UserState) {
    this.id = state.id;
    this.telegramId = state.telegramId;
    this.locale = state.locale;
    this.isPremium = state.isPremium;
    this.username = state.username;
    this.firstName = state.firstName;
    this.lastName = state.lastName;
    this.timezone = state.timezone;
    this.createdAt = state.createdAt;
    this.updatedAt = state.updatedAt;
  }

  /**
   * Rehydrate a user from trusted persisted state (adapter row or test fixture).
   * Validates locale; shape is enforced by TypeScript.
   */
  static rehydrate(state: UserState): User {
    if (!isLocale(state.locale)) {
      throw new InvalidLocaleError(state.locale);
    }
    return new User(state);
  }
}

export type { Locale } from './locale';
