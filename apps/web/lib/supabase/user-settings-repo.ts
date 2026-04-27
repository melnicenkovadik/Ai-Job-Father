import 'server-only';
import {
  UserId,
  UserSettings,
  type UserSettingsPatch,
  type UserSettingsRepo,
  isLocale,
} from '@ai-job-bot/core';
import { type SupabaseClient, createClient } from '@supabase/supabase-js';
import { env } from '../env';

interface UserSettingsRow {
  id: string;
  user_id: string;
  locale: string;
  notify_push: boolean;
  notify_email: boolean;
  notify_weekly: boolean;
  has_onboarded: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * `user_settings` is created by migration 20260428000000 but is not yet in
 * `packages/db/types/generated.ts` (Docker is required for `db:gen-types`
 * and is not running locally). Once the types are regenerated, this adapter
 * should be migrated to use the typed `createServiceRoleClient()` like
 * `SupabaseProfileRepo` does.
 */
let cached: SupabaseClient | null = null;
function client(): SupabaseClient {
  if (cached) return cached;
  cached = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    db: { schema: 'public' },
  });
  return cached;
}

function rowToSettings(row: UserSettingsRow): UserSettings {
  return UserSettings.rehydrate({
    userId: UserId.from(row.user_id),
    locale: isLocale(row.locale) ? row.locale : 'en',
    notifications: {
      push: row.notify_push,
      email: row.notify_email,
      weekly: row.notify_weekly,
    },
    hasOnboarded: row.has_onboarded,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  });
}

export class SupabaseUserSettingsRepo implements UserSettingsRepo {
  async findByUserId(userId: UserId): Promise<UserSettings | null> {
    const { data, error } = await client()
      .from('user_settings')
      .select('*')
      .eq('user_id', userId.value)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToSettings(data as UserSettingsRow) : null;
  }

  async update(userId: UserId, patch: UserSettingsPatch): Promise<UserSettings> {
    const updates: Partial<UserSettingsRow> = {};
    if (patch.locale !== undefined) updates.locale = patch.locale;
    if (patch.notifications?.push !== undefined) updates.notify_push = patch.notifications.push;
    if (patch.notifications?.email !== undefined) updates.notify_email = patch.notifications.email;
    if (patch.notifications?.weekly !== undefined)
      updates.notify_weekly = patch.notifications.weekly;
    if (patch.hasOnboarded !== undefined) updates.has_onboarded = patch.hasOnboarded;

    const { data, error } = await client()
      .from('user_settings')
      .update(updates)
      .eq('user_id', userId.value)
      .select('*')
      .single();
    if (error) throw error;
    return rowToSettings(data as UserSettingsRow);
  }
}
