import 'server-only';
import { type SupabaseClient, createClient } from '@supabase/supabase-js';
import { env } from '../env';
import type { Database } from './types';

let cached: SupabaseClient<Database> | null = null;

/**
 * Service-role Supabase client. Bypasses RLS. **Server-only.**
 *
 * Use exclusively for:
 *   - Upserting into `users` during initData verification (server gets first-hand truth).
 *   - Signing Supabase-compatible JWTs (out of scope — see lib/auth/jwt.ts).
 *
 * Never import this from a client component.
 */
export function createServiceRoleClient(): SupabaseClient<Database> {
  if (cached) return cached;
  cached = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    db: { schema: 'public' },
  });
  return cached;
}

/** Reset cached client (test-only utility). */
export function __resetServiceRoleClientCache(): void {
  cached = null;
}
