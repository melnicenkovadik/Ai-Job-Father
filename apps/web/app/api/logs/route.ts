export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { env } from '@/lib/env';
import { LOG_LEVELS, LOG_SOURCES } from '@/lib/logger/types';
import type { LogEvent } from '@/lib/logger/types';
import { type SupabaseClient, createClient } from '@supabase/supabase-js';

let logsClient: SupabaseClient | null = null;
function getLogsClient(): SupabaseClient {
  if (logsClient) return logsClient;
  logsClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    db: { schema: 'public' },
  });
  return logsClient;
}

const MAX_BATCH = 50;
const MAX_MESSAGE = 4000;
const MAX_DATA_BYTES = 16 * 1024;

interface LogsBody {
  events?: unknown;
}

function sanitize(event: unknown): LogEvent | null {
  if (event === null || typeof event !== 'object') return null;
  const e = event as Record<string, unknown>;
  if (typeof e.level !== 'string' || !LOG_LEVELS.includes(e.level as never)) return null;
  if (typeof e.source !== 'string' || !LOG_SOURCES.includes(e.source as never)) return null;
  if (typeof e.context !== 'string' || e.context.length === 0) return null;
  if (typeof e.message !== 'string') return null;

  let data: Record<string, unknown> | undefined;
  if (e.data && typeof e.data === 'object' && !Array.isArray(e.data)) {
    const json = JSON.stringify(e.data);
    if (json.length <= MAX_DATA_BYTES) {
      data = e.data as Record<string, unknown>;
    }
  }

  let error: LogEvent['error'];
  if (e.error && typeof e.error === 'object') {
    const err = e.error as Record<string, unknown>;
    error = {
      name: typeof err.name === 'string' ? err.name.slice(0, 200) : 'Error',
      message: typeof err.message === 'string' ? err.message.slice(0, MAX_MESSAGE) : '',
      stack: typeof err.stack === 'string' ? err.stack.slice(0, MAX_MESSAGE) : undefined,
    };
  }

  return {
    level: e.level as LogEvent['level'],
    source: e.source as LogEvent['source'],
    context: e.context.slice(0, 200),
    message: e.message.slice(0, MAX_MESSAGE),
    data,
    error,
    userId: typeof e.userId === 'string' ? e.userId.slice(0, 64) : undefined,
    telegramId: typeof e.telegramId === 'number' ? e.telegramId : undefined,
    url: typeof e.url === 'string' ? e.url.slice(0, 500) : undefined,
    userAgent: typeof e.userAgent === 'string' ? e.userAgent.slice(0, 500) : undefined,
  };
}

export async function POST(req: Request): Promise<Response> {
  let body: LogsBody;
  try {
    body = (await req.json()) as LogsBody;
  } catch {
    return Response.json({ error: 'malformed_body' }, { status: 400 });
  }
  const raw = Array.isArray(body.events) ? body.events : null;
  if (!raw) return Response.json({ error: 'missing_events' }, { status: 400 });

  const sanitized = raw
    .slice(0, MAX_BATCH)
    .map(sanitize)
    .filter((e): e is LogEvent => e !== null);
  if (sanitized.length === 0) return Response.json({ accepted: 0 });

  try {
    const supabase = getLogsClient();
    const rows = sanitized.map((e) => ({
      level: e.level,
      source: e.source,
      context: e.context,
      message: e.message,
      data: e.data ?? null,
      error_name: e.error?.name ?? null,
      error_message: e.error?.message ?? null,
      error_stack: e.error?.stack ?? null,
      user_id: e.userId ?? null,
      telegram_id: e.telegramId ?? null,
      url: e.url ?? null,
      user_agent: e.userAgent ?? null,
    }));
    const { error } = await supabase.from('app_logs').insert(rows);
    if (error) {
      return Response.json({ error: 'insert_failed', message: error.message }, { status: 500 });
    }
  } catch (err) {
    const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    return Response.json({ error: 'insert_failed', message }, { status: 500 });
  }

  return Response.json({ accepted: sanitized.length });
}
