export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { env } from '@/lib/env';
import { getServerLogger } from '@/lib/logger/server';
import { createOpenAIResumeParser } from '@/lib/openai/resume-parser';
import { SupabaseAiCreditRepo } from '@/lib/supabase/ai-credit-repo';
import { SupabaseProfileRepo } from '@/lib/supabase/profile-repo';
import { downloadResume, uploadResume } from '@/lib/supabase/resume-storage';
import { createServiceRoleClient } from '@/lib/supabase/server';
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
 * Two entry shapes:
 *   1. `multipart/form-data` with `file` — fresh upload (initial parse path).
 *   2. `application/json` with `{ profileId }` — re-parse a previously uploaded
 *      PDF from Supabase Storage (`profile.resume_storage_path`). Lets the
 *      user pay for AI accuracy without re-uploading the file.
 *
 * Flow (both paths):
 *   1. Verify user has at least one unconsumed credit.
 *   2. Resolve PDF bytes (multipart -> formData; JSON -> downloadResume).
 *   3. Run the OpenAI parser. If it throws, return error WITHOUT consuming.
 *   4. On success, atomically consume one credit. If consume returns false
 *      (race / no credit), still return the parse result (the user effectively
 *      got a free parse — we'd rather grant the parse than block on a race).
 *   5. Best-effort upload to Storage (multipart only — re-parse path skips
 *      since the bytes already live there).
 *
 * Why not consume-first-then-parse? An OpenAI rate-limit or model failure
 * would burn the user's credit. Better to charge only on confirmed success.
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

  // Branch on content-type. JSON body = re-parse from storage; everything
  // else falls through to the multipart upload path.
  const contentType = req.headers.get('content-type') ?? '';
  const isJson = contentType.toLowerCase().includes('application/json');

  let bytes: Uint8Array;
  let filename: string;
  let isReparse = false;

  if (isJson) {
    let body: { profileId?: unknown };
    try {
      body = (await req.json()) as { profileId?: unknown };
    } catch {
      return Response.json({ error: 'invalid_json' }, { status: 400 });
    }
    const profileId = typeof body.profileId === 'string' ? body.profileId : '';
    if (!profileId) {
      return Response.json({ error: 'missing_profile_id' }, { status: 400 });
    }

    const repo = new SupabaseProfileRepo(createServiceRoleClient());
    const profile = await repo.findById(profileId);
    if (!profile) {
      return Response.json({ error: 'profile_not_found' }, { status: 404 });
    }
    if (profile.userId !== user.id.value) {
      return Response.json({ error: 'forbidden' }, { status: 403 });
    }
    if (!profile.resumeStoragePath) {
      return Response.json({ error: 'no_resume_in_storage' }, { status: 404 });
    }

    const downloaded = await downloadResume(profile.resumeStoragePath);
    if (!downloaded) {
      return Response.json({ error: 'storage_download_failed' }, { status: 502 });
    }
    bytes = downloaded;
    filename = profile.resumeStoragePath.split('/').pop() ?? 'resume.pdf';
    isReparse = true;
    log.info({
      context: 'api/profile/parse-resume.ai',
      message: 're-parse from storage',
      data: { userId: user.id.value, profileId, storagePath: profile.resumeStoragePath },
    });
  } else {
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
    bytes = new Uint8Array(await file.arrayBuffer());
    filename = file.name;
  }

  const input = {
    pdfBytes: bytes,
    userId: user.id.value,
    filename,
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
      data: { userId: user.id.value, consumed, isReparse },
    });
  } catch (err) {
    log.error({ context: 'api/profile/parse-resume.ai.consume', error: err });
    // Don't fail the request — we already have a parse, returning it is best UX.
  }

  // Re-parse path: bytes already live in Storage; skip the upload.
  // Multipart path: best-effort upload so /profile re-parse works next time.
  let resumeStoragePath: string | undefined;
  let resumeFileHash: string | undefined;
  if (isReparse) {
    // Hash is already on the profile row; we just don't echo it back. The
    // client uses `parser: 'openai'` + the new field values to refresh state.
  } else {
    const upload = await uploadResume(user.id.value, filename, bytes);
    resumeStoragePath = upload.uploaded ? upload.storagePath : undefined;
    resumeFileHash = upload.hash;
  }

  return Response.json({
    ...parsed,
    parser: 'openai',
    ...(resumeStoragePath !== undefined ? { resumeStoragePath } : {}),
    ...(resumeFileHash !== undefined ? { resumeFileHash } : {}),
    resumeParsedAt: new Date().toISOString(),
    resumeParseModel: env.OPENAI_RESUME_MODEL,
  });
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
