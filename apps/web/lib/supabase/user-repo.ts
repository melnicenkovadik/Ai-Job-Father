import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  isLocale,
  type Locale,
  TelegramId,
  User,
  UserId,
  type UpsertUserInput,
  type UserRepo,
} from '@ai-job-bot/core';
import type { Database, UserRow } from './types';

/**
 * Supabase adapter implementing the `UserRepo` port from packages/core.
 * Uses the service-role client for upserts (insert bypasses RLS — no client
 * insert policy exists per design, see migration 20260418000100_users_rls.sql).
 */
export class SupabaseUserRepo implements UserRepo {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async findByTelegramId(telegramId: TelegramId): Promise<User | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('telegram_id', telegramId.value)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToUser(data) : null;
  }

  async upsert(input: UpsertUserInput): Promise<User> {
    const { data, error } = await this.supabase
      .from('users')
      .upsert(
        {
          telegram_id: input.telegramId.value,
          username: input.username ?? null,
          first_name: input.firstName ?? null,
          last_name: input.lastName ?? null,
          locale: input.locale,
          is_premium: input.isPremium,
          timezone: input.timezone ?? null,
        },
        { onConflict: 'telegram_id' },
      )
      .select('*')
      .single();
    if (error) throw error;
    return rowToUser(data);
  }
}

function rowToUser(row: UserRow): User {
  const locale: Locale = isLocale(row.locale) ? row.locale : 'en';
  return User.rehydrate({
    id: UserId.from(row.id),
    telegramId: TelegramId.from(row.telegram_id),
    locale,
    isPremium: row.is_premium,
    username: row.username ?? undefined,
    firstName: row.first_name ?? undefined,
    lastName: row.last_name ?? undefined,
    timezone: row.timezone ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  });
}
