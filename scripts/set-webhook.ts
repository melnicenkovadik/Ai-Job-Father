import { resolve } from 'node:path';
/**
 * Register the Telegram webhook against the Mini App deployment.
 * Usage: `pnpm set-webhook` (reads env from `.env.local` or process env).
 *
 * Re-run whenever the tunnel URL changes (e.g. each ngrok restart).
 */
import { config as loadDotenv } from 'dotenv';
import { Bot } from 'grammy';

loadDotenv({ path: resolve(process.cwd(), '.env.local') });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(
      `Missing env var ${name}. Set TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET_TOKEN, and NEXT_PUBLIC_MINI_APP_URL in .env.local (public HTTPS URL).`,
    );
    process.exit(1);
  }
  return value;
}

const TOKEN = requireEnv('TELEGRAM_BOT_TOKEN');
const SECRET = requireEnv('TELEGRAM_WEBHOOK_SECRET_TOKEN');
const BASE = requireEnv('NEXT_PUBLIC_MINI_APP_URL');

const webhookUrl = `${BASE.replace(/\/+$/, '')}/api/bot/webhook`;
const bot = new Bot(TOKEN);

async function main(): Promise<void> {
  const before = await bot.api.getWebhookInfo();
  console.log('Webhook info (before):');
  console.log(JSON.stringify(before, null, 2));

  await bot.api.setWebhook(webhookUrl, {
    secret_token: SECRET,
    // `successful_payment` lives inside `message` updates per Telegram Bot API —
    // we don't need to list it in `allowed_updates`.
    allowed_updates: ['message', 'callback_query', 'pre_checkout_query'],
    drop_pending_updates: true,
  });

  const after = await bot.api.getWebhookInfo();
  console.log('\nWebhook info (after):');
  console.log(JSON.stringify(after, null, 2));

  if (after.url !== webhookUrl) {
    console.error(`\nExpected webhook URL ${webhookUrl}, got ${after.url}`);
    process.exit(2);
  }
  console.log(`\nWebhook registered: ${webhookUrl}`);
}

main().catch((err) => {
  console.error('set-webhook failed:', err);
  process.exit(3);
});
