import 'server-only';
import { getServerLogger } from '@/lib/logger/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { SupabaseUserSettingsRepo } from '@/lib/supabase/user-settings-repo';
import { getBot } from '@/lib/telegram/bot';
import type { Campaign, UserId } from '@ai-job-bot/core';

/**
 * Outbound push-notification dispatcher.
 *
 * v1 ships only `notifyCampaignCompleted`. It looks up the user's
 * `telegram_id` + `user_settings.notify_push`, formats a short message,
 * and sends it via grammY (`bot.api.sendMessage`).
 *
 * Best-effort: every failure path is caught + logged. Notifications must
 * never break the request that triggered them — the user already got
 * their data; the push is a bonus channel.
 *
 * Dedup: relies on the fact that the campaign status transition to
 * 'completed' only fires once (prev !== 'completed' && next === 'completed').
 * If we observe duplicates in production, gate via app_logs lookup
 * `context='notify/completed/{campaignId}'`.
 */

interface CampaignSummary {
  readonly id: string;
  readonly title: string;
  readonly progressApplied: number;
  readonly quota: number;
}

export async function notifyCampaignCompleted(userId: UserId, campaign: Campaign): Promise<void> {
  const log = getServerLogger();
  const summary: CampaignSummary = {
    id: campaign.id.value,
    title: campaign.title,
    progressApplied: campaign.progressApplied,
    quota: campaign.quota,
  };

  try {
    const settingsRepo = new SupabaseUserSettingsRepo();
    const settings = await settingsRepo.findByUserId(userId);
    if (!settings || !settings.notifications.push) {
      log.info({
        context: 'lib/notifications.completed',
        message: 'push disabled or no settings row, skipping',
        data: { userId: userId.value, campaignId: summary.id },
      });
      return;
    }

    const supabase = createServiceRoleClient();
    const { data: userRow, error } = await supabase
      .from('users')
      .select('telegram_id')
      .eq('id', userId.value)
      .maybeSingle();
    if (error || !userRow) {
      log.warn({
        context: 'lib/notifications.completed',
        message: 'no user row to look up telegram_id',
        data: { userId: userId.value },
        error,
      });
      return;
    }
    const telegramId = userRow.telegram_id;

    const text = formatCompletedMessage(summary);
    await getBot().api.sendMessage(telegramId, text, {
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    });
    log.info({
      context: 'lib/notifications.completed',
      message: 'push sent',
      data: { userId: userId.value, telegramId, campaignId: summary.id },
    });
  } catch (err) {
    log.warn({
      context: 'lib/notifications.completed',
      message: 'dispatch failed',
      data: { userId: userId.value, campaignId: summary.id },
      error: err,
    });
  }
}

/**
 * Convenience helper: only fires the notification when status transitioned
 * from non-completed to completed. Use at route boundaries that own the
 * before/after view of the campaign (the simulator's lazy-tick path).
 */
export async function notifyIfJustCompleted(prevStatus: string, next: Campaign): Promise<void> {
  if (prevStatus === 'completed') return;
  if (next.status !== 'completed') return;
  await notifyCampaignCompleted(next.userId, next);
}

function formatCompletedMessage(c: CampaignSummary): string {
  const progress = `${c.progressApplied} / ${c.quota}`;
  // HTML-safe: titles can contain <, >, &.
  const title = escapeHtml(c.title);
  return [
    '✅ <b>Campaign completed</b>',
    `<b>${title}</b>`,
    `Applications sent: <b>${progress}</b>`,
  ].join('\n');
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return c;
    }
  });
}
