export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { webhookCallback } from 'grammy';
import { env } from '@/lib/env';
import { getBot, TelegramEnvMissingError } from '@/lib/telegram/bot';

/**
 * Telegram bot webhook.
 *
 * grammY is instantiated lazily (see `lib/telegram/bot.ts`) so Vercel build-time
 * page-data collection doesn't fail when `TELEGRAM_BOT_TOKEN` is still unset.
 * The `webhookCallback` is likewise built on the first POST rather than at module
 * scope, so missing `TELEGRAM_WEBHOOK_SECRET_TOKEN` doesn't blow up the build.
 *
 * At runtime, if either env var is missing we return a plain 503 with a message
 * the user can read in Telegram's bot debug logs.
 */
type Handler = (req: Request) => Response | Promise<Response>;
let cachedHandler: Handler | undefined;

function getHandler(): Handler {
  if (cachedHandler) return cachedHandler;
  const secret = env.TELEGRAM_WEBHOOK_SECRET_TOKEN;
  if (!secret) {
    throw new TelegramEnvMissingError('TELEGRAM_WEBHOOK_SECRET_TOKEN');
  }
  cachedHandler = webhookCallback(getBot(), 'std/http', {
    secretToken: secret,
  });
  return cachedHandler;
}

export async function POST(req: Request): Promise<Response> {
  try {
    return await getHandler()(req);
  } catch (err) {
    if (err instanceof TelegramEnvMissingError) {
      return Response.json(
        { error: 'telegram_env_missing', message: err.message },
        { status: 503 },
      );
    }
    throw err;
  }
}
