import 'server-only';
import { type SupabaseClient, createClient } from '@supabase/supabase-js';
import { env } from '../env';
import type { LogEvent, LogTransport } from './types';

let cached: SupabaseClient | null = null;

/**
 * Untyped service-role client used solely by the logger. We keep it apart
 * from `createServiceRoleClient()` so that the typed `Database` schema can
 * stay strict — `app_logs` is added in migration 20260427000000 and will
 * land in the generated types after the next `db:gen-types` run.
 */
function client(): SupabaseClient {
  if (cached) return cached;
  cached = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    db: { schema: 'public' },
  });
  return cached;
}

export class SupabaseTransport implements LogTransport {
  async send(event: LogEvent): Promise<void> {
    try {
      await client()
        .from('app_logs')
        .insert({
          level: event.level,
          source: event.source,
          context: event.context,
          message: event.message,
          data: event.data ?? null,
          error_name: event.error?.name ?? null,
          error_message: event.error?.message ?? null,
          error_stack: event.error?.stack ?? null,
          user_id: event.userId ?? null,
          telegram_id: event.telegramId ?? null,
          url: event.url ?? null,
          user_agent: event.userAgent ?? null,
        });
    } catch {
      // intentionally silenced — never let logging break the request
    }
  }
}
