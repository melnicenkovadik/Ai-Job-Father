export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { getServerLogger } from '@/lib/logger/server';
import { SupabaseUserSettingsRepo } from '@/lib/supabase/user-settings-repo';
import { requireAuth } from '@/lib/telegram/auth-middleware';
import {
  SUPPORTED_LOCALES,
  UserSettings,
  type UserSettingsPatch,
  updateUserSettings,
} from '@ai-job-bot/core';
import { z } from 'zod';

const SystemClock = { now: () => new Date() };

/**
 * GET /api/settings → current user's user_settings row.
 * PUT /api/settings → patch locale and notification toggles.
 *
 * The row is auto-created by the `users_after_insert_create_settings` trigger
 * (migration 20260428000200). If the user record predates the trigger, GET
 * lazily materialises a default-state response from the user's locale; PUT
 * still requires the row to exist (use case raises if missing).
 */

const patchSchema = z.object({
  locale: z.enum(SUPPORTED_LOCALES).optional(),
  notifications: z
    .object({
      push: z.boolean().optional(),
      email: z.boolean().optional(),
      weekly: z.boolean().optional(),
    })
    .optional(),
});

function settingsToDto(s: UserSettings): SettingsDto {
  return {
    locale: s.locale,
    notifications: {
      push: s.notifications.push,
      email: s.notifications.email,
      weekly: s.notifications.weekly,
    },
    hasOnboarded: s.hasOnboarded,
    updatedAt: s.updatedAt.toISOString(),
  };
}

export interface SettingsDto {
  locale: (typeof SUPPORTED_LOCALES)[number];
  notifications: { push: boolean; email: boolean; weekly: boolean };
  hasOnboarded: boolean;
  updatedAt: string;
}

export const GET = requireAuth(async (_req, { user }) => {
  const repo = new SupabaseUserSettingsRepo();
  const settings =
    (await repo.findByUserId(user.id)) ?? UserSettings.default(user.id, user.locale, new Date());
  return Response.json(settingsToDto(settings));
});

export const PUT = requireAuth(async (req, { user }) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: 'validation',
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      },
      { status: 400 },
    );
  }
  const patch: UserSettingsPatch = {
    ...(parsed.data.locale !== undefined ? { locale: parsed.data.locale } : {}),
    ...(parsed.data.notifications !== undefined
      ? { notifications: parsed.data.notifications }
      : {}),
  };

  const repo = new SupabaseUserSettingsRepo();
  try {
    const next = await updateUserSettings(
      { userId: user.id, patch },
      { userSettingsRepo: repo, clock: SystemClock },
    );
    getServerLogger().info({
      context: 'api/settings.PUT',
      message: 'settings updated',
      data: {
        keys: Object.keys(parsed.data),
      },
    });
    return Response.json(settingsToDto(next));
  } catch (err) {
    getServerLogger().error({ context: 'api/settings.PUT', error: err });
    return Response.json({ error: 'internal' }, { status: 500 });
  }
});
