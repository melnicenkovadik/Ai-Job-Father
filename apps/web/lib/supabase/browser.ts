'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { env } from '../env';
import type { Database } from './types';

let cached: SupabaseClient<Database> | null = null;

/**
 * Browser Supabase client keyed by the anon key. JWT (minted by
 * `/api/auth/session`) is applied via `applySupabaseJwt`; RLS then keys on
 * `auth.uid() = users.id`.
 */
export function getBrowserClient(): SupabaseClient<Database> {
  if (typeof window === 'undefined') {
    throw new Error('getBrowserClient() invoked on the server');
  }
  if (cached) return cached;
  cached = createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  return cached;
}

/**
 * Apply a freshly-minted Supabase JWT to the browser client's session.
 * We do not persist refresh tokens — on 401 we re-POST initData.
 */
export async function applySupabaseJwt(jwt: string): Promise<void> {
  const client = getBrowserClient();
  await client.auth.setSession({ access_token: jwt, refresh_token: '' });
}
