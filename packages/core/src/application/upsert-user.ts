import { detectLocale, type Locale } from '../domain/locale';
import { TelegramId, type User } from '../domain/user';
import type { UserRepo } from './ports/user-repo';

export interface UpsertUserDeps {
  readonly userRepo: UserRepo;
}

export interface UpsertUserCommand {
  readonly telegramId: number;
  readonly isPremium: boolean;
  readonly username?: string | undefined;
  readonly firstName?: string | undefined;
  readonly lastName?: string | undefined;
  readonly timezone?: string | undefined;
  /** Raw Telegram language_code — not yet narrowed to Locale. */
  readonly languageCode?: string | undefined;
}

/**
 * Upsert a user keyed by `telegram_id`.
 *
 * Policy (R-3.1): on first upsert, locale auto-detected from `languageCode`.
 * On subsequent upserts, persisted locale is preserved — user's explicit choice
 * (Phase 5 settings) wins, not whatever device they last opened the app on.
 */
export async function upsertUser(
  cmd: UpsertUserCommand,
  deps: UpsertUserDeps,
): Promise<User> {
  const telegramId = TelegramId.from(cmd.telegramId);
  const existing = await deps.userRepo.findByTelegramId(telegramId);
  const locale: Locale = existing?.locale ?? detectLocale(cmd.languageCode);
  return deps.userRepo.upsert({
    telegramId,
    locale,
    isPremium: cmd.isPremium,
    username: cmd.username,
    firstName: cmd.firstName,
    lastName: cmd.lastName,
    timezone: cmd.timezone,
  });
}
