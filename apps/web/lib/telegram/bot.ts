import 'server-only';
import { Bot, InlineKeyboard } from 'grammy';
import { env } from '../env';
import { registerStarsPaymentHandlers } from './payment-handlers';

/**
 * grammY Bot singleton — lazily instantiated.
 *
 * Commands point at the Mini App via inline Web App buttons (R-1.1..R-1.5).
 * User upsert happens server-side when the Mini App loads (via
 * `/api/auth/session`), not here — Telegram's bot webhook does not ship
 * `initData`; that's the WebApp side.
 *
 * Why lazy? Building on Vercel collects page data at build time, which executes
 * every route module. If we `new Bot(env.TELEGRAM_BOT_TOKEN)` at module scope and
 * the token isn't set in the build environment (common before the user provisions
 * Telegram env vars), grammY throws `Empty token!` and the whole build fails.
 * Deferring construction to the first handler call lets the build succeed even
 * without Telegram credentials; the first real webhook POST surfaces a clean 500
 * if the token is still missing at runtime.
 */

class TelegramEnvMissingError extends Error {
  constructor(varName: string) {
    super(
      `Telegram env var ${varName} is missing. Set it in .env.local (local dev) or Vercel Project Settings → Environment Variables (production).`,
    );
    this.name = 'TelegramEnvMissingError';
  }
}

function getMiniAppBaseUrl(): string {
  const base = env.NEXT_PUBLIC_MINI_APP_URL;
  if (!base) throw new TelegramEnvMissingError('NEXT_PUBLIC_MINI_APP_URL');
  return base.replace(/\/+$/, '');
}

function openAppKeyboard(route = '/'): InlineKeyboard {
  const url = `${getMiniAppBaseUrl()}${route}`;
  return new InlineKeyboard().webApp('Open App', url);
}

let botSingleton: Bot | undefined;

export function getBot(): Bot {
  if (botSingleton) return botSingleton;
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new TelegramEnvMissingError('TELEGRAM_BOT_TOKEN');
  const bot = new Bot(token);

  bot.command('start', async (ctx) => {
    await ctx.reply('Welcome! Tap to open the app.', {
      reply_markup: openAppKeyboard('/'),
    });
  });

  bot.command('new', async (ctx) => {
    await ctx.reply("Let's create a campaign.", {
      reply_markup: openAppKeyboard('/campaign/new/wizard'),
    });
  });

  bot.command('profile', async (ctx) => {
    await ctx.reply('Manage your profile.', {
      reply_markup: openAppKeyboard('/profile'),
    });
  });

  bot.command('status', async (ctx) => {
    // Phase 1: static placeholder. Real campaigns list lands Phase 5.
    await ctx.reply('No campaigns yet. Tap to get started.', {
      reply_markup: openAppKeyboard('/'),
    });
  });

  bot.command('help', async (ctx) => {
    await ctx.reply(
      [
        'Commands:',
        '/start — open app',
        '/new — new campaign',
        '/profile — manage profile',
        '/status — campaigns summary',
        '/help — this message',
      ].join('\n'),
      { reply_markup: openAppKeyboard('/') },
    );
  });

  registerStarsPaymentHandlers(bot);

  botSingleton = bot;
  return bot;
}

/**
 * Sync bot commands shown in Telegram's client UI. Idempotent; safe to call
 * on every deploy.
 */
export async function syncBotCommands(): Promise<void> {
  await getBot().api.setMyCommands([
    { command: 'start', description: 'Open the app' },
    { command: 'new', description: 'Create a new campaign' },
    { command: 'profile', description: 'Manage your profile' },
    { command: 'status', description: 'Last campaigns summary' },
    { command: 'help', description: 'Help' },
  ]);
}

export { TelegramEnvMissingError };
