export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { getServerLogger } from '@/lib/logger/server';
import { TelegramEnvMissingError, resolveSession } from '@/lib/telegram/session';
import {
  InvalidInitDataSignatureError,
  MalformedInitDataError,
  StaleInitDataError,
} from '@/lib/telegram/verify-init-data';

export async function POST(req: Request): Promise<Response> {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Tma ')) {
    return Response.json({ error: 'missing_init_data' }, { status: 401 });
  }
  const raw = auth.slice(4);
  try {
    const { user, jwt, expiresAt } = await resolveSession(raw);
    return Response.json({
      jwt,
      expiresAt: expiresAt.toISOString(),
      user: {
        id: user.id.value,
        telegramId: user.telegramId.value,
        locale: user.locale,
        firstName: user.firstName ?? null,
        lastName: user.lastName ?? null,
        username: user.username ?? null,
        isPremium: user.isPremium,
      },
    });
  } catch (err) {
    if (err instanceof StaleInitDataError) {
      return Response.json({ error: 'stale_init_data' }, { status: 401 });
    }
    if (err instanceof InvalidInitDataSignatureError) {
      return Response.json({ error: 'invalid_signature' }, { status: 403 });
    }
    if (err instanceof MalformedInitDataError) {
      return Response.json({ error: 'malformed_init_data' }, { status: 400 });
    }
    if (err instanceof TelegramEnvMissingError) {
      return Response.json(
        { error: 'telegram_env_missing', message: err.message },
        { status: 503 },
      );
    }
    const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    getServerLogger().error({
      context: 'api/auth/session',
      message: 'resolveSession failed',
      error: err,
    });
    return Response.json({ error: 'internal', message }, { status: 500 });
  }
}
