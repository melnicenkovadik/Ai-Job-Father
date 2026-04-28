export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { env } from '@/lib/env';
import { getServerLogger } from '@/lib/logger/server';
import { decodePayload, encodePayload } from '@/lib/payments/payload';
import { hashSnapshot } from '@/lib/payments/snapshot';
import { TonVerificationError, verifyTonTransaction } from '@/lib/payments/ton-verifier';
import { getCampaignProgressDriver } from '@/lib/sim/factory';
import { SupabaseCampaignEventRepo } from '@/lib/supabase/campaign-event-repo';
import { SupabaseCampaignRepo } from '@/lib/supabase/campaign-repo';
import { SupabasePaymentRepo } from '@/lib/supabase/payment-repo';
import { requireAuth } from '@/lib/telegram/auth-middleware';
import {
  CampaignId,
  DEFAULT_USD_CENTS_PER_TON,
  recordPayment,
  usdCentsToTonNano,
} from '@ai-job-bot/core';
import { z } from 'zod';

const bodySchema = z.object({
  campaignId: z.string().uuid(),
  txHash: z.string().min(40).max(128),
  nonce: z.string().min(8).max(64),
});

/**
 * POST /api/payments/confirm
 *
 * TON-only today. Stars confirmation lives in the bot webhook (no client
 * round-trip needed). The flow:
 *   1. Idempotency lookup on (provider='ton', provider_charge_id=txHash).
 *      Returns the existing payment if already recorded.
 *   2. Poll TonAPI for the tx (3× 2s backoff). Verify recipient + amount +
 *      comment + success.
 *   3. Call recordPayment — flips campaign through paid → searching, emits
 *      paid + started events, starts the simulator.
 */
export const POST = requireAuth(async (req, { user }) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: 'validation',
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      },
      { status: 400 },
    );
  }

  const cid = CampaignId.from(parsed.data.campaignId);
  const log = getServerLogger();

  try {
    const campaignRepo = new SupabaseCampaignRepo();
    const paymentRepo = new SupabasePaymentRepo();

    // Idempotency first — webhook replays + client retries collapse here.
    const existing = await paymentRepo.findByProviderCharge('ton', parsed.data.txHash);
    if (existing?.isSucceeded()) {
      log.info({
        context: 'api/payments.confirm',
        message: 'idempotent return',
        data: { campaignId: cid.value, txHash: parsed.data.txHash },
      });
      return Response.json({ status: 'already_recorded', paymentId: existing.id });
    }

    const campaign = await campaignRepo.findById(cid);
    if (!campaign) {
      return Response.json({ error: 'not_found' }, { status: 404 });
    }
    if (!campaign.userId.equals(user.id)) {
      return Response.json({ error: 'forbidden' }, { status: 403 });
    }
    const snapshot = campaign.snapshotData;
    if (!snapshot) {
      return Response.json(
        {
          error: 'snapshot_missing',
          message: 'snapshot was not frozen — call /api/payments/init first',
        },
        { status: 409 },
      );
    }

    if (!env.TON_PAYMENT_RECIPIENT_ADDRESS) {
      return Response.json(
        { error: 'ton_not_configured', message: 'TON_PAYMENT_RECIPIENT_ADDRESS not set' },
        { status: 503 },
      );
    }

    const expectedAmountNano = usdCentsToTonNano(
      campaign.priceAmountCents,
      DEFAULT_USD_CENTS_PER_TON,
    );
    const expectedComment = encodePayload({
      campaignId: cid.value,
      nonce: parsed.data.nonce,
    });

    let verified: Awaited<ReturnType<typeof verifyTonTransaction>>;
    try {
      verified = await verifyTonTransaction({
        txHash: parsed.data.txHash,
        expectedRecipient: env.TON_PAYMENT_RECIPIENT_ADDRESS,
        expectedAmountNano,
        expectedComment,
      });
    } catch (err) {
      if (err instanceof TonVerificationError) {
        log.warn({
          context: 'api/payments.confirm',
          message: 'ton verification failed',
          data: {
            code: err.code,
            campaignId: cid.value,
            txHash: parsed.data.txHash,
          },
          error: err,
        });
        return Response.json(
          { error: err.code, message: err.message },
          { status: err.code === 'tx_not_found' ? 202 : 400 },
        );
      }
      throw err;
    }

    // Sanity: payload nonce must match what we issued in /init.
    const decoded = decodePayload(verified.comment);
    if (!decoded || decoded.campaignId !== cid.value || decoded.nonce !== parsed.data.nonce) {
      return Response.json(
        { error: 'comment_mismatch', message: 'payload mismatch in tx comment' },
        { status: 400 },
      );
    }

    const eventRepo = new SupabaseCampaignEventRepo();
    const payment = await recordPayment(
      {
        userId: user.id,
        campaignId: cid,
        provider: 'ton',
        providerChargeId: parsed.data.txHash,
        amountCents: campaign.priceAmountCents,
        amountProvider: Number(verified.amountNano),
        currency: 'TON',
        snapshotData: snapshot,
        snapshotHash: hashSnapshot(snapshot),
        nonce: parsed.data.nonce,
        rawEvent: verified.raw as unknown as Record<string, unknown>,
      },
      {
        paymentRepo,
        campaignRepo,
        campaignEventRepo: eventRepo,
        campaignProgressDriver: getCampaignProgressDriver(),
      },
    );

    log.info({
      context: 'api/payments.confirm',
      message: 'ton payment recorded',
      data: {
        campaignId: cid.value,
        txHash: parsed.data.txHash,
        amountNano: verified.amountNano.toString(),
      },
    });

    return Response.json({ status: 'recorded', paymentId: payment.id });
  } catch (err) {
    log.error({
      context: 'api/payments.confirm',
      data: { campaignId: cid.value },
      error: err,
    });
    const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    return Response.json({ error: 'internal', message }, { status: 500 });
  }
});
