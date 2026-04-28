'use server';

import { auditLog } from '../audit';
import { env } from '../env';
import { getServiceClient } from '../supabase';

export type BroadcastResult = {
  sent: number;
  failed: number;
  errors: string[];
};

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendTelegramMessage(
  telegramId: number,
  text: string,
  token: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramId,
        text,
        parse_mode: 'HTML',
      }),
    });
    const data = (await res.json()) as { ok: boolean; description?: string };
    return data.ok ? { ok: true } : { ok: false, error: data.description ?? 'Request failed' };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export async function sendBroadcast(userIds: string[], text: string): Promise<BroadcastResult> {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return { sent: 0, failed: userIds.length, errors: ['TELEGRAM_BOT_TOKEN not configured'] };
  }

  const supabase = getServiceClient();
  const { data: users } = await supabase.from('users').select('id, telegram_id').in('id', userIds);

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const user of (users ?? []) as { id: string; telegram_id: number }[]) {
    const result = await sendTelegramMessage(user.telegram_id, text, token);

    if (result.ok) {
      sent++;
      await supabase.from('app_logs').insert({
        level: 'info',
        source: 'web',
        context: 'admin/broadcast.send',
        message: `broadcast sent to user ${user.id}`,
        data: { user_id: user.id, telegram_id: user.telegram_id },
      });
    } else {
      failed++;
      errors.push(`${user.telegram_id}: ${result.error ?? 'unknown'}`);
    }

    // Rate-limit to 1 message/sec (Telegram limits)
    await sleep(1000);
  }

  await auditLog('broadcast.send', {
    total: userIds.length,
    sent,
    failed,
    by: 'dashboard',
  });

  return { sent, failed, errors };
}
