/**
 * UserSettings aggregate — Wave A. 1:1 with `User`.
 *
 * Framework-free. Adapters hydrate via `UserSettings.rehydrate(...)` after a
 * row read; the application layer composes `UserSettings.default(...)` when a
 * fresh row is needed (the actual seed insert happens in a database trigger,
 * see migration 20260428000200_user_settings_seed_trigger.sql).
 */

import { type Locale, isLocale } from './locale';
import { DomainError, InvalidLocaleError, UserId } from './user';

export interface NotificationPrefs {
  readonly push: boolean;
  readonly email: boolean;
  readonly weekly: boolean;
}

export const DEFAULT_NOTIFICATIONS: NotificationPrefs = {
  push: true,
  email: false,
  weekly: true,
};

export interface UserSettingsProps {
  readonly userId: UserId;
  readonly locale: Locale;
  readonly notifications: NotificationPrefs;
  readonly hasOnboarded: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export class UserSettings {
  private constructor(private readonly props: UserSettingsProps) {}

  get userId(): UserId {
    return this.props.userId;
  }
  get locale(): Locale {
    return this.props.locale;
  }
  get notifications(): NotificationPrefs {
    return this.props.notifications;
  }
  get hasOnboarded(): boolean {
    return this.props.hasOnboarded;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  static rehydrate(props: UserSettingsProps): UserSettings {
    if (!isLocale(props.locale)) {
      throw new InvalidLocaleError(props.locale);
    }
    return new UserSettings(props);
  }

  static default(userId: UserId, locale: Locale, now: Date): UserSettings {
    return UserSettings.rehydrate({
      userId,
      locale,
      notifications: DEFAULT_NOTIFICATIONS,
      hasOnboarded: false,
      createdAt: now,
      updatedAt: now,
    });
  }

  withPatch(patch: UserSettingsPatch, now: Date): UserSettings {
    const nextLocale = patch.locale ?? this.props.locale;
    if (!isLocale(nextLocale)) {
      throw new InvalidLocaleError(nextLocale);
    }
    const nextNotifications: NotificationPrefs = {
      push: patch.notifications?.push ?? this.props.notifications.push,
      email: patch.notifications?.email ?? this.props.notifications.email,
      weekly: patch.notifications?.weekly ?? this.props.notifications.weekly,
    };
    return new UserSettings({
      ...this.props,
      locale: nextLocale,
      notifications: nextNotifications,
      hasOnboarded: patch.hasOnboarded ?? this.props.hasOnboarded,
      updatedAt: now,
    });
  }
}

/**
 * Partial update — every field optional. `notifications` accepts a partial of
 * the three flags so toggling a single one doesn't require resending all
 * three.
 */
export interface UserSettingsPatch {
  readonly locale?: Locale | undefined;
  readonly notifications?:
    | {
        readonly push?: boolean | undefined;
        readonly email?: boolean | undefined;
        readonly weekly?: boolean | undefined;
      }
    | undefined;
  readonly hasOnboarded?: boolean | undefined;
}

export class UserSettingsValidationError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}
