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
import { CampaignId } from '@ai-job-bot/core';
import { z } from 'zod';

const bodySchema = z.object({
  campaignId: z.string().uuid(),
  provider: z.enum(['stars', 'ton']),
});

/**
 * POST /api/payments/init
 *
 * Stars branch:
 *   - validate campaign ownership + status='draft'
 *   - freeze snapshot via campaignRepo.freezeSnapshot (no-op if already set)
 *   - convert USD cents → Stars
 *   - createInvoiceLink with payload `aijb:{campaignId}:{nonce}`
 *   - returns { provider: 'stars', invoiceLink, starsAmount, nonce }
 *
 * TON branch: returns 501 (Wave E).
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

  if (parsed.data.provider === 'ton') {
    return Response.json(
      { error: 'not_implemented', message: 'TON payments land in Wave E' },
      { status: 501 },
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

    // Freeze snapshot. Idempotent — adapter only writes when status='draft',
    // and we just checked that. Subsequent retries from the same screen find
    // the snapshot already in place.
    const snapshot = campaign.snapshotData ?? buildCampaignSnapshot(campaign);
    const snapHash = hashSnapshot(snapshot);
    if (!campaign.snapshotData) {
      await repo.freezeSnapshot(cid, snapshot, 1);
    }

    const starsAmount = resolveStarsAmount(campaign.priceAmountCents);
    const nonce = generateNonce();
    const payload = encodePayload({ campaignId: cid.value, nonce });

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
        campaignId: cid.value,
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
