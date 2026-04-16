import 'server-only';
import { Bot, InlineKeyboard } from 'grammy';
import { env } from '../env';

/**
 * grammY Bot singleton.
 *
 * Commands point at the Mini App via inline Web App buttons (R-1.1..R-1.5).
 * User upsert happens server-side when the Mini App loads (via
 * `/api/auth/session`), not here — Telegram's bot webhook does not ship
 * `initData`; that's the WebApp side.
 */
export const bot = new Bot(env.TELEGRAM_BOT_TOKEN);

const miniAppUrl = env.NEXT_PUBLIC_MINI_APP_URL.replace(/\/+$/, '');

function openAppKeyboard(route = '/'): InlineKeyboard {
  const url = `${miniAppUrl}${route}`;
  return new InlineKeyboard().webApp('Open App', url);
}

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

/**
 * Sync bot commands shown in Telegram's client UI. Idempotent; safe to call
 * on every deploy.
 */
export async function syncBotCommands(): Promise<void> {
  await bot.api.setMyCommands([
    { command: 'start', description: 'Open the app' },
    { command: 'new', description: 'Create a new campaign' },
    { command: 'profile', description: 'Manage your profile' },
    { command: 'status', description: 'Last campaigns summary' },
    { command: 'help', description: 'Help' },
  ]);
}
