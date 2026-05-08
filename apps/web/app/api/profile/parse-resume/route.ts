export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { getServerLogger } from '@/lib/logger/server';
import { withApiLogging } from '@/lib/logger/with-api-logging';
import { createHeuristicResumeParser } from '@/lib/resume/heuristic-parser';
import { uploadResume } from '@/lib/supabase/resume-storage';
import { requireAuth } from '@/lib/telegram/auth-middleware';
import {
  ResumeFormatError,
  ResumeParseError,
  ResumeParserUnavailableError,
  ResumeRateLimitError,
} from '@ai-job-bot/core';

/**
 * Free-tier resume parse — pure heuristics, no AI.
 *
 * Pipeline: PDF text extraction (`unpdf`) → multilingual regex extractors in
 * `packages/core/domain/resume-heuristics`. Always free.
 *
 * For higher-accuracy AI parse the user explicitly opts in via Stars-gated
 * `POST /api/profile/parse-resume/ai` (separate route).
 *
 * multipart/form-data with `file` (PDF, ≤ 10 MB).
 */

const MAX_PDF_BYTES = 10 * 1024 * 1024;

export const POST = withApiLogging(
  'api/profile/parse-resume.POST',
  requireAuth(async (req, { user }) => {
    const log = getServerLogger();
    log.info({ context: 'api/profile/parse-resume', message: 'route hit' });

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      log.warn({ context: 'api/profile/parse-resume', message: 'invalid_multipart' });
      return Response.json({ error: 'invalid_multipart' }, { status: 400 });
    }

    const file = form.get('file');
    if (!(file instanceof File)) {
      log.warn({ context: 'api/profile/parse-resume', message: 'missing_file' });
      return Response.json({ error: 'missing_file' }, { status: 400 });
    }
    if (file.size === 0) {
      log.warn({
        context: 'api/profile/parse-resume',
        message: 'empty_file',
        data: { name: file.name },
      });
      return Response.json({ error: 'empty_file' }, { status: 400 });
    }
    if (file.size > MAX_PDF_BYTES) {
      log.warn({
        context: 'api/profile/parse-resume',
        message: 'file_too_large',
        data: { name: file.name, size: file.size, limit: MAX_PDF_BYTES },
      });
      return Response.json(
        { error: 'file_too_large', limit: MAX_PDF_BYTES, size: file.size },
        { status: 413 },
      );
    }
    if (file.type && file.type !== 'application/pdf') {
      log.warn({
        context: 'api/profile/parse-resume',
        message: 'invalid_mime',
        data: { mime: file.type },
      });
      return Response.json({ error: 'invalid_mime', mime: file.type }, { status: 415 });
    }

    log.info({
      context: 'api/profile/parse-resume',
      message: 'file received',
      data: { name: file.name, size: file.size, mime: file.type },
    });

    // unpdf transfers the buffer to a worker, which detaches it. Keep a
    // private copy for Storage so the post-parse upload doesn't blow up
    // with "%TypedArray%.prototype.set on a detached ArrayBuffer".
    const original = new Uint8Array(await file.arrayBuffer());
    const storageBytes = new Uint8Array(original); // own copy, parser-safe
    const input = {
      pdfBytes: original,
      userId: user.id.value,
      filename: file.name,
    };

    const parser = createHeuristicResumeParser();
    try {
      log.info({ context: 'api/profile/parse-resume', message: 'heuristic parser invoked' });
      const startedAt = Date.now();
      const parsed = await parser.parse(input);
      log.info({
        context: 'api/profile/parse-resume',
        message: 'parsed',
        data: {
          durationMs: Date.now() - startedAt,
          skills: parsed.skills?.length ?? 0,
          experience: parsed.experience?.length ?? 0,
          education: parsed.education?.length ?? 0,
          languages: parsed.languages?.length ?? 0,
        },
      });
      // Best-effort upload to Supabase Storage so the user can re-parse
      // with AI later without re-uploading. The helper logs warnings on
      // failure and returns uploaded:false; the parse itself stays valid.
      const upload = await uploadResume(user.id.value, file.name, storageBytes);
      return Response.json({
        ...parsed,
        parser: 'heuristic',
        resumeStoragePath: upload.uploaded ? upload.storagePath : undefined,
        resumeFileHash: upload.hash,
        resumeParsedAt: new Date().toISOString(),
        resumeParseModel: 'heuristic-v1',
      });
    } catch (err) {
      return mapParserError(err);
    }
  }),
);

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
  getServerLogger().error({ context: 'api/profile/parse-resume', error: err });
  return Response.json({ error: 'internal' }, { status: 500 });
}
