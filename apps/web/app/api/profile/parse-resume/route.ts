export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { env } from '@/lib/env';
import { createOpenAIResumeParser } from '@/lib/openai/resume-parser';
import { createHeuristicResumeParser } from '@/lib/resume/heuristic-parser';
import { requireAuth } from '@/lib/telegram/auth-middleware';
import {
  ResumeFormatError,
  ResumeParseError,
  ResumeParserUnavailableError,
  ResumeRateLimitError,
} from '@ai-job-bot/core';

/**
 * Resume parse endpoint.
 *
 * Primary tier: OpenAI gpt-5.1 via the adapter from ADR 0006 (paid with
 * Stars in Phase 4 — currently free because the payment wall isn't wired
 * yet). If `OPENAI_API_KEY` is missing or the AI call fails with a
 * "parser unavailable" error, we fall back to the in-house heuristic
 * parser (ADR 0007) so the UX never dead-ends.
 *
 * multipart/form-data with `file` (PDF, ≤ 10 MB).
 * Auth'd via the existing initData header flow.
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

  const aiParser = createOpenAIResumeParser(env.OPENAI_API_KEY, env.OPENAI_RESUME_MODEL);

  try {
    const parsed = await aiParser.parse(input);
    return Response.json(parsed);
  } catch (aiErr) {
    if (aiErr instanceof ResumeParserUnavailableError) {
      // OPENAI_API_KEY missing on this deployment — degrade to heuristics.
      const heuristic = createHeuristicResumeParser();
      try {
        const parsed = await heuristic.parse(input);
        return Response.json(parsed);
      } catch (hErr) {
        return mapParserError(hErr);
      }
    }
    return mapParserError(aiErr);
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
  console.error('parse-resume: unexpected error', err);
  return Response.json({ error: 'internal' }, { status: 500 });
}
