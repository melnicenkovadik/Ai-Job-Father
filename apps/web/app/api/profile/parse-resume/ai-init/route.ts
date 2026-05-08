export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { getServerLogger } from '@/lib/logger/server';
import { withApiLogging } from '@/lib/logger/with-api-logging';
import { encodeAiParsePayload, generateNonce } from '@/lib/payments/payload';
import { resolveAiParseStarsAmount } from '@/lib/payments/stars-amount';
import { createStarsInvoiceLink } from '@/lib/payments/stars-invoice';
import { SupabaseAiCreditRepo } from '@/lib/supabase/ai-credit-repo';
import { requireAuth } from '@/lib/telegram/auth-middleware';

/**
 * POST /api/profile/parse-resume/ai-init
 *
 * Issues a Telegram Stars invoice for one AI re-parse credit. Client opens
 * the link via `Telegram.WebApp.openInvoice(link, callback)`. After the user
 * pays, the bot's `successful_payment` handler grants the credit; the client
 * then calls `/api/profile/parse-resume/ai` to actually run the parse.
 *
 * Idempotency: if the user already has an unconsumed credit, returns
 * `{ alreadyHasCredit: true }` instead of creating a new invoice — the
 * client can call the parse endpoint directly.
 */
export const POST = withApiLogging(
  'api/profile/parse-resume/ai-init.POST',
  requireAuth(async (_req, { user }) => {
    const log = getServerLogger();

    const credits = new SupabaseAiCreditRepo();
    const has = await credits.hasUnconsumed(user.id.value, 'resume_parse');
    if (has) {
      return Response.json({ alreadyHasCredit: true });
    }

    const starsAmount = resolveAiParseStarsAmount();
    const nonce = generateNonce();
    const payload = encodeAiParsePayload({ userId: user.id.value, nonce });

    try {
      const invoiceLink = await createStarsInvoiceLink({
        title: 'AI resume parse',
        description: 'One-time AI re-parse of your resume PDF',
        payload,
        starsAmount,
      });
      log.info({
        context: 'api/profile/parse-resume.ai-init',
        message: 'invoice created',
        data: { userId: user.id.value, starsAmount },
      });
      return Response.json({ invoiceLink, starsAmount, nonce });
    } catch (err) {
      log.error({
        context: 'api/profile/parse-resume.ai-init',
        data: { userId: user.id.value },
        error: err,
      });
      return Response.json({ error: 'invoice_failed' }, { status: 500 });
    }
  }),
);
