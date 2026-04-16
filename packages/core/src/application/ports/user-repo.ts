import type { TelegramId, User } from '../../domain/user';

/**
 * UserRepo port — persistence boundary for the User aggregate.
 *
 * Adapter lives in `apps/web/lib/supabase/user-repo.ts` (Phase 1 infrastructure).
 * In-memory fake lives in `test/fakes/fake-user-repo.ts` for use-case tests.
 */
export interface UserRepo {
  findByTelegramId(telegramId: TelegramId): Promise<User | null>;
  upsert(input: UpsertUserInput): Promise<User>;
}

export interface UpsertUserInput {
  readonly telegramId: TelegramId;
  readonly username?: string | undefined;
  readonly firstName?: string | undefined;
  readonly lastName?: string | undefined;
  readonly isPremium: boolean;
  /**
   * Locale to persist. Pre-resolved to a supported locale by the caller
   * (the `upsertUser` use case runs `detectLocale` + first-time-only policy).
   */
  readonly locale: import('../../domain/locale').Locale;
  readonly timezone?: string | undefined;
}
