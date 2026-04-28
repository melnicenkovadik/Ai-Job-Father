export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { getServerLogger } from '@/lib/logger/server';
import { createHeuristicResumeParser } from '@/lib/resume/heuristic-parser';
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

export const POST = requireAuth(async (req, { user }) => {
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

  const parser = createHeuristicResumeParser();
  try {
    const parsed = await parser.parse(input);
    return Response.json({ ...parsed, parser: 'heuristic' });
  } catch (err) {
    return mapParserError(err);
  }
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
  getServerLogger().error({ context: 'api/profile/parse-resume', error: err });
  return Response.json({ error: 'internal' }, { status: 500 });
}
