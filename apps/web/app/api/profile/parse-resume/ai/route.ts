export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { env } from '@/lib/env';
import { getServerLogger } from '@/lib/logger/server';
import { createOpenAIResumeParser } from '@/lib/openai/resume-parser';
import { SupabaseAiCreditRepo } from '@/lib/supabase/ai-credit-repo';
import { requireAuth } from '@/lib/telegram/auth-middleware';
import {
  ResumeFormatError,
  ResumeParseError,
  ResumeParserUnavailableError,
  ResumeRateLimitError,
} from '@ai-job-bot/core';

/**
 * POST /api/profile/parse-resume/ai
 *
 * Stars-gated AI parse. Requires the user to hold an unconsumed `ai_credits`
 * row (granted by the bot's `successful_payment` handler after the user pays
 * via the invoice link from `/ai-init`).
 *
 * Flow:
 *   1. Verify user has at least one unconsumed credit (hasUnconsumed).
 *   2. Run the OpenAI parser. If it throws, return error WITHOUT consuming.
 *   3. On success, atomically consume one credit. If consume returns false
 *      (race / no credit), still return the parse result (the user effectively
 *      got a free parse — we'd rather grant the parse than block on a race).
 *
 * Why not consume-first-then-parse? An OpenAI rate-limit or model failure
 * would burn the user's credit. Better to charge only on confirmed success.
 *
 * multipart/form-data with `file` (PDF, ≤ 10 MB).
 */

const MAX_PDF_BYTES = 10 * 1024 * 1024;

export const POST = requireAuth(async (req, { user }) => {
  const log = getServerLogger();
  const credits = new SupabaseAiCreditRepo();

  try {
    const has = await credits.hasUnconsumed(user.id.value, 'resume_parse');
    if (!has) {
      return Response.json({ error: 'no_credit' }, { status: 402 });
    }
  } catch (err) {
    log.error({ context: 'api/profile/parse-resume.ai.check', error: err });
    return Response.json({ error: 'internal' }, { status: 500 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: 'invalid_multipart' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return Response.json({ error: 'missing_file' }, { status: 400 });
  }
  if (file.size === 0) {
    return Response.json({ error: 'empty_file' }, { status: 400 });
  }
  if (file.size > MAX_PDF_BYTES) {
    return Response.json(
      { error: 'file_too_large', limit: MAX_PDF_BYTES, size: file.size },
      { status: 413 },
    );
  }
  if (file.type && file.type !== 'application/pdf') {
    return Response.json({ error: 'invalid_mime', mime: file.type }, { status: 415 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const input = {
    pdfBytes: bytes,
    userId: user.id.value,
    filename: file.name,
  };

  const parser = createOpenAIResumeParser(env.OPENAI_API_KEY, env.OPENAI_RESUME_MODEL);
  let parsed: Awaited<ReturnType<typeof parser.parse>>;
  try {
    parsed = await parser.parse(input);
  } catch (err) {
    return mapParserError(err);
  }

  // Parse succeeded — burn one credit. Race-safe via the conditional UPDATE
  // inside consumeOne. If it returns false (someone else consumed first), we
  // still return the parse result — better UX than refusing because of a race.
  try {
    const consumed = await credits.consumeOne(user.id.value, 'resume_parse');
    log.info({
      context: 'api/profile/parse-resume.ai',
      message: consumed ? 'credit consumed' : 'credit consume race (lost)',
      data: { userId: user.id.value, consumed },
    });
  } catch (err) {
    log.error({ context: 'api/profile/parse-resume.ai.consume', error: err });
    // Don't fail the request — we already have a parse, returning it is best UX.
  }

  return Response.json({ ...parsed, parser: 'openai' });
});

function mapParserError(err: unknown): Response {
  if (err instanceof ResumeFormatError) {
    return Response.json({ error: 'format', message: err.message }, { status: 415 });
  }
  if (err instanceof ResumeRateLimitError) {
    return Response.json({ error: 'rate_limit', message: err.message }, { status: 429 });
  }
  if (err instanceof ResumeParserUnavailableError) {
    return Response.json({ error: 'unavailable', message: err.message }, { status: 503 });
  }
  if (err instanceof ResumeParseError) {
    return Response.json({ error: 'parse', message: err.message }, { status: 500 });
  }
  getServerLogger().error({ context: 'api/profile/parse-resume.ai', error: err });
  return Response.json({ error: 'internal' }, { status: 500 });
}
