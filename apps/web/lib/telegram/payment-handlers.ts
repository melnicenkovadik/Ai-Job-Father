import 'server-only';
import { getServerLogger } from '@/lib/logger/server';
import { decodePayload } from '@/lib/payments/payload';
import { hashSnapshot } from '@/lib/payments/snapshot';
import { resolveStarsAmount } from '@/lib/payments/stars-amount';
import { getCampaignProgressDriver } from '@/lib/sim/factory';
import { SupabaseCampaignEventRepo } from '@/lib/supabase/campaign-event-repo';
import { SupabaseCampaignRepo } from '@/lib/supabase/campaign-repo';
import { SupabasePaymentRepo } from '@/lib/supabase/payment-repo';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { SupabaseUserRepo } from '@/lib/supabase/user-repo';
import { CampaignId, TelegramId, recordPayment } from '@ai-job-bot/core';
import type { Bot, Context } from 'grammy';

/**
 * Wires Stars payment handlers onto the grammY bot. Called once during the
 * lazy `getBot()` initialiser.
 *
 * Reference flow:
 *   1. `pre_checkout_query` — decode payload, verify ownership + price + status,
 *      answer true/false. Telegram won't deliver `successful_payment` if we
 *      reject here, so this is our gate.
 *   2. `message:successful_payment` — record the payment idempotently.
 *      `(provider='stars', provider_charge_id=telegram_payment_charge_id)` is the
 *      dedup key — Telegram retries on bot 5xx hit the same row.
 */
export function registerStarsPaymentHandlers(bot: Bot): void {
  bot.on('pre_checkout_query', handlePreCheckout);
  bot.on('message:successful_payment', handleSuccessfulPayment);
}

async function handlePreCheckout(ctx: Context): Promise<void> {
  const log = getServerLogger();
  const q = ctx.preCheckoutQuery;
  if (!q) return;

  const decoded = decodePayload(q.invoice_payload);
  if (!decoded) {
    log.warn({
      context: 'bot.payments.pre_checkout_query',
      message: 'malformed payload',
      data: { payload: q.invoice_payload },
    });
    await ctx.answerPreCheckoutQuery(false, 'Invalid payment payload');
    return;
  }

  try {
    const repo = new SupabaseCampaignRepo();
    const campaign = await repo.findById(CampaignId.from(decoded.campaignId));
    if (!campaign) {
      await ctx.answerPreCheckoutQuery(false, 'Campaign not found');
      return;
    }
    if (campaign.status !== 'draft') {
      await ctx.answerPreCheckoutQuery(false, 'Campaign already paid');
      return;
    }
    const expectedStars = resolveStarsAmount(campaign.priceAmountCents);
    if (q.total_amount !== expectedStars) {
      log.warn({
        context: 'bot.payments.pre_checkout_query',
        message: 'amount mismatch',
        data: { expected: expectedStars, got: q.total_amount, campaignId: decoded.campaignId },
      });
      await ctx.answerPreCheckoutQuery(false, 'Amount mismatch');
      return;
    }

    log.info({
      context: 'bot.payments.pre_checkout_query',
      message: 'pre-checkout ok',
      data: { campaignId: decoded.campaignId, starsAmount: q.total_amount },
    });
    await ctx.answerPreCheckoutQuery(true);
  } catch (err) {
    log.error({
      context: 'bot.payments.pre_checkout_query',
      data: { campaignId: decoded.campaignId },
      error: err,
    });
    await ctx.answerPreCheckoutQuery(false, 'Server error, try again');
  }
}

async function handleSuccessfulPayment(ctx: Context): Promise<void> {
  const log = getServerLogger();
  const message = ctx.message;
  const payment = message?.successful_payment;
  if (!payment || !ctx.from) {
    return;
  }

  const decoded = decodePayload(payment.invoice_payload);
  if (!decoded) {
    log.error({
      context: 'bot.payments.successful_payment',
      message: 'malformed payload on success',
      data: { payload: payment.invoice_payload },
    });
    return;
  }

  try {
    const userRepo = new SupabaseUserRepo(createServiceRoleClient());
    const user = await userRepo.findByTelegramId(TelegramId.from(ctx.from.id));
    if (!user) {
      log.error({
        context: 'bot.payments.successful_payment',
        message: 'user not found',
        data: { telegramId: ctx.from.id, campaignId: decoded.campaignId },
      });
      return;
    }

    const campaignRepo = new SupabaseCampaignRepo();
    const campaign = await campaignRepo.findById(CampaignId.from(decoded.campaignId));
    if (!campaign) {
      log.error({
        context: 'bot.payments.successful_payment',
        message: 'campaign not found',
        data: { campaignId: decoded.campaignId },
      });
      return;
    }

    const snapshot = campaign.snapshotData;
    if (!snapshot) {
      log.error({
        context: 'bot.payments.successful_payment',
        message: 'snapshot missing — payments/init was skipped?',
        data: { campaignId: decoded.campaignId },
      });
      return;
    }

    const paymentRepo = new SupabasePaymentRepo();
    const eventRepo = new SupabaseCampaignEventRepo();

    await recordPayment(
      {
        userId: user.id,
        campaignId: campaign.id,
        provider: 'stars',
        providerChargeId: payment.telegram_payment_charge_id,
        amountCents: campaign.priceAmountCents,
        amountProvider: payment.total_amount,
        currency: 'STARS',
        snapshotData: snapshot,
        snapshotHash: hashSnapshot(snapshot),
        nonce: decoded.nonce,
        rawEvent: payment as unknown as Record<string, unknown>,
      },
      {
        paymentRepo,
        campaignRepo,
        campaignEventRepo: eventRepo,
        campaignProgressDriver: getCampaignProgressDriver(),
      },
    );

    log.info({
      context: 'bot.payments.successful_payment',
      message: 'payment recorded',
      data: {
        campaignId: campaign.id.value,
        chargeId: payment.telegram_payment_charge_id,
        starsAmount: payment.total_amount,
      },
    });

    await ctx.reply('✅ Payment received. Tap below to watch progress.', {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Open campaign',
              web_app: { url: campaignWebAppUrl(campaign.id.value) },
            },
          ],
        ],
      },
    });
  } catch (err) {
    log.error({
      context: 'bot.payments.successful_payment',
      data: { campaignId: decoded.campaignId, chargeId: payment.telegram_payment_charge_id },
      error: err,
    });
    // Don't reply with error — Telegram will retry on 5xx and we want
    // idempotency to absorb it on the next pass.
  }
}

function campaignWebAppUrl(campaignId: string): string {
  const base = (process.env.NEXT_PUBLIC_MINI_APP_URL ?? '').replace(/\/+$/, '');
  return `${base}/campaign/${campaignId}`;
}
