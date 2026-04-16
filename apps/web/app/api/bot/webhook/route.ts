export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { webhookCallback } from 'grammy';
import { bot } from '@/lib/telegram/bot';
import { env } from '@/lib/env';

// `secretToken` makes grammY reject any POST missing the
// `X-Telegram-Bot-Api-Secret-Token` header (R-1.7).
const handler = webhookCallback(bot, 'std/http', {
  secretToken: env.TELEGRAM_WEBHOOK_SECRET_TOKEN,
});

export async function POST(req: Request): Promise<Response> {
  return handler(req);
}
