import 'server-only';
import { getServerLogger } from '@/lib/logger/server';
import { type AiParsePayload, type CampaignPayload, decodePayload } from '@/lib/payments/payload';
import { hashSnapshot } from '@/lib/payments/snapshot';
import { resolveAiParseStarsAmount, resolveStarsAmount } from '@/lib/payments/stars-amount';
import { getCampaignProgressDriver } from '@/lib/sim/factory';
import { SupabaseAiCreditRepo } from '@/lib/supabase/ai-credit-repo';
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
 *   1. `pre_checkout_query` — decode payload, route by purpose, verify, answer.
 *      Telegram won't deliver `successful_payment` if we reject here, so this
 *      is our gate.
 *   2. `message:successful_payment` — record the payment idempotently.
 *      For campaigns: insert payments row + flip status. For ai_parse: insert
 *      ai_credits row. Both keyed by Telegram's charge_id (UNIQUE) for replay safety.
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
    if (decoded.purpose === 'campaign') {
      await preCheckoutCampaign(ctx, decoded);
    } else if (decoded.purpose === 'ai_parse') {
      await preCheckoutAiParse(ctx, decoded);
    }
  } catch (err) {
    log.error({
      context: 'bot.payments.pre_checkout_query',
      data: { purpose: decoded.purpose },
      error: err,
    });
    await ctx.answerPreCheckoutQuery(false, 'Server error, try again');
  }
}

async function preCheckoutCampaign(ctx: Context, p: CampaignPayload): Promise<void> {
  const log = getServerLogger();
  const q = ctx.preCheckoutQuery;
  if (!q) return;

  const repo = new SupabaseCampaignRepo();
  const campaign = await repo.findById(CampaignId.from(p.campaignId));
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
      data: { expected: expectedStars, got: q.total_amount, campaignId: p.campaignId },
    });
    await ctx.answerPreCheckoutQuery(false, 'Amount mismatch');
    return;
  }
  await ctx.answerPreCheckoutQuery(true);
}

async function preCheckoutAiParse(ctx: Context, p: AiParsePayload): Promise<void> {
  const log = getServerLogger();
  const q = ctx.preCheckoutQuery;
  if (!q) return;

  // The userId was minted by our own /api/profile/parse-resume/ai-init endpoint
  // (auth-gated) and embedded in the opaque payload — Telegram returns it
  // verbatim. So we trust the id; we only verify the amount here.
  const expectedStars = resolveAiParseStarsAmount();
  if (q.total_amount !== expectedStars) {
    log.warn({
      context: 'bot.payments.pre_checkout_query',
      message: 'ai_parse amount mismatch',
      data: { expected: expectedStars, got: q.total_amount, userId: p.userId },
    });
    await ctx.answerPreCheckoutQuery(false, 'Amount mismatch');
    return;
  }
  await ctx.answerPreCheckoutQuery(true);
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
    if (decoded.purpose === 'campaign') {
      await onCampaignPaid(ctx, decoded, payment);
    } else if (decoded.purpose === 'ai_parse') {
      await onAiParsePaid(ctx, decoded, payment);
    }
  } catch (err) {
    log.error({
      context: 'bot.payments.successful_payment',
      data: { purpose: decoded.purpose },
      error: err,
    });
    // Don't reply with error — Telegram will retry on 5xx and we want
    // idempotency to absorb it on the next pass.
  }
}

async function onCampaignPaid(
  ctx: Context,
  decoded: CampaignPayload,
  payment: NonNullable<NonNullable<Context['message']>['successful_payment']>,
): Promise<void> {
  const log = getServerLogger();
  if (!ctx.from) return;

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
    message: 'campaign payment recorded',
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
}

async function onAiParsePaid(
  ctx: Context,
  decoded: AiParsePayload,
  payment: NonNullable<NonNullable<Context['message']>['successful_payment']>,
): Promise<void> {
  const log = getServerLogger();
  const credits = new SupabaseAiCreditRepo();
  await credits.grant({
    userId: decoded.userId,
    feature: 'resume_parse',
    chargeId: payment.telegram_payment_charge_id,
    starsAmount: payment.total_amount,
  });

  log.info({
    context: 'bot.payments.successful_payment',
    message: 'ai_parse credit granted',
    data: {
      userId: decoded.userId,
      chargeId: payment.telegram_payment_charge_id,
      starsAmount: payment.total_amount,
    },
  });

  await ctx.reply('✅ AI parse credit unlocked. Re-open the upload screen to use it.');
}

function campaignWebAppUrl(campaignId: string): string {
  const base = (process.env.NEXT_PUBLIC_MINI_APP_URL ?? '').replace(/\/+$/, '');
  return `${base}/campaign/${campaignId}`;
}
