export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { env } from '@/lib/env';
import { getServerLogger } from '@/lib/logger/server';
import { encodePayload, generateNonce } from '@/lib/payments/payload';
import { buildCampaignSnapshot, hashSnapshot } from '@/lib/payments/snapshot';
import { resolveStarsAmount } from '@/lib/payments/stars-amount';
import { createStarsInvoiceLink } from '@/lib/payments/stars-invoice';
import { SupabaseCampaignRepo } from '@/lib/supabase/campaign-repo';
import { requireAuth } from '@/lib/telegram/auth-middleware';
import {
  type Campaign,
  CampaignId,
  DEFAULT_USD_CENTS_PER_TON,
  usdCentsToTonNano,
} from '@ai-job-bot/core';
import { z } from 'zod';

const bodySchema = z.object({
  campaignId: z.string().uuid(),
  provider: z.enum(['stars', 'ton']),
});

const TON_VALIDITY_SECONDS = 5 * 60;

/**
 * POST /api/payments/init
 *
 * Branches by provider. Both flows freeze the campaign snapshot, generate a
 * nonce, and return whatever the matching client SDK needs to send a real
 * payment.
 *
 *   stars → returns invoice link the client opens via Telegram.WebApp.openInvoice
 *   ton   → returns recipient + amountNano + comment for TonConnect sendTransaction
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
  const repo = new SupabaseCampaignRepo();

  try {
    const campaign = await repo.findById(cid);
    if (!campaign) {
      return Response.json({ error: 'not_found' }, { status: 404 });
    }
    if (!campaign.userId.equals(user.id)) {
      return Response.json({ error: 'forbidden' }, { status: 403 });
    }
    if (campaign.status !== 'draft') {
      return Response.json(
        { error: 'invalid_state', message: `campaign status=${campaign.status}` },
        { status: 409 },
      );
    }

    // Freeze snapshot. Idempotent — only writes when status='draft', which we
    // just checked. Retries from the same screen find the snapshot already there.
    const snapshot = campaign.snapshotData ?? buildCampaignSnapshot(campaign);
    const snapHash = hashSnapshot(snapshot);
    if (!campaign.snapshotData) {
      await repo.freezeSnapshot(cid, snapshot, 1);
    }

    const nonce = generateNonce();
    const payload = encodePayload({ campaignId: cid.value, nonce });

    if (parsed.data.provider === 'stars') {
      return await issueStarsInvoice(campaign, payload, nonce, snapHash);
    }
    return await issueTonInstructions(campaign, payload, nonce, snapHash);
  } catch (err) {
    getServerLogger().error({
      context: 'api/payments.init',
      data: { campaignId: cid.value, provider: parsed.data.provider },
      error: err,
    });
    const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    return Response.json({ error: 'internal', message }, { status: 500 });
  }
});

async function issueStarsInvoice(
  campaign: Campaign,
  payload: string,
  nonce: string,
  snapHash: string,
): Promise<Response> {
  const starsAmount = resolveStarsAmount(campaign.priceAmountCents);
  const invoiceLink = await createStarsInvoiceLink({
    title: campaign.title,
    description: `${campaign.quota} applications · ${campaign.category}`,
    payload,
    starsAmount,
  });
  getServerLogger().info({
    context: 'api/payments.init',
    message: 'stars invoice created',
    data: {
      campaignId: campaign.id.value,
      starsAmount,
      snapshotHash: snapHash,
    },
  });
  return Response.json({
    provider: 'stars',
    invoiceLink,
    starsAmount,
    nonce,
  });
}

async function issueTonInstructions(
  campaign: Campaign,
  payload: string,
  nonce: string,
  snapHash: string,
): Promise<Response> {
  if (!env.TON_PAYMENT_RECIPIENT_ADDRESS) {
    getServerLogger().error({
      context: 'api/payments.init',
      message: 'TON_PAYMENT_RECIPIENT_ADDRESS not set',
      data: { campaignId: campaign.id.value },
    });
    return Response.json(
      { error: 'ton_not_configured', message: 'TON_PAYMENT_RECIPIENT_ADDRESS not set' },
      { status: 503 },
    );
  }
  const amountNano = usdCentsToTonNano(campaign.priceAmountCents, DEFAULT_USD_CENTS_PER_TON);
  const validUntil = Math.floor(Date.now() / 1000) + TON_VALIDITY_SECONDS;
  getServerLogger().info({
    context: 'api/payments.init',
    message: 'ton instructions issued',
    data: {
      campaignId: campaign.id.value,
      amountNano: amountNano.toString(),
      snapshotHash: snapHash,
    },
  });
  return Response.json({
    provider: 'ton',
    recipient: env.TON_PAYMENT_RECIPIENT_ADDRESS,
    amountNano: amountNano.toString(),
    comment: payload,
    validUntil,
    nonce,
  });
}
