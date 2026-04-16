export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { env } from '@/lib/env';
import { bot } from '@/lib/telegram/bot';
import { webhookCallback } from 'grammy';

// `secretToken` makes grammY reject any POST missing the
// `X-Telegram-Bot-Api-Secret-Token` header (R-1.7).
const handler = webhookCallback(bot, 'std/http', {
  secretToken: env.TELEGRAM_WEBHOOK_SECRET_TOKEN,
});

export async function POST(req: Request): Promise<Response> {
  return handler(req);
}
