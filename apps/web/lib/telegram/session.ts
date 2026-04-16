import 'server-only';
import { upsertUser, type User } from '@ai-job-bot/core';
import { env } from '../env';
import { signSupabaseJwt } from '../auth/jwt';
import { createServiceRoleClient } from '../supabase/server';
import { SupabaseUserRepo } from '../supabase/user-repo';
import { verifyInitData, type VerifiedInitData } from './verify-init-data';

export interface ResolvedSession {
  readonly user: User;
  readonly jwt: string;
  readonly expiresAt: Date;
  readonly verified: VerifiedInitData;
}

export interface ResolveSessionOptions {
  /** Read/profile endpoints tolerate 24h; payment endpoints tighten to 1h per R-2.3. */
  readonly maxAgeSeconds?: number;
}

/**
 * Resolve a Mini App session from raw Telegram `initData`:
 *   1. HMAC-verify the signature + freshness.
 *   2. Upsert the `users` row (service role bypasses RLS).
 *   3. Mint a short-lived Supabase JWT with `sub = users.id`.
 *
 * Throws `InvalidInitDataSignatureError` | `StaleInitDataError` |
 * `MalformedInitDataError` — callers translate to HTTP status.
 */
export async function resolveSession(
  rawInitData: string,
  opts: ResolveSessionOptions = {},
): Promise<ResolvedSession> {
  const maxAgeSeconds = opts.maxAgeSeconds ?? 60 * 60 * 24;
  const verified = verifyInitData(rawInitData, {
    botToken: env.TELEGRAM_BOT_TOKEN,
    maxAgeSeconds,
  });

  const userRepo = new SupabaseUserRepo(createServiceRoleClient());
  const user = await upsertUser(
    {
      telegramId: verified.user.id,
      username: verified.user.username,
      firstName: verified.user.first_name,
      lastName: verified.user.last_name,
      isPremium: verified.user.is_premium ?? false,
      languageCode: verified.user.language_code,
    },
    { userRepo },
  );

  const { jwt, expiresAt } = await signSupabaseJwt(user.id.value, {
    secret: env.SUPABASE_JWT_SECRET,
  });

  return { user, jwt, expiresAt, verified };
}
