export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { createHeuristicResumeParser } from '@/lib/resume/heuristic-parser';
import { requireAuth } from '@/lib/telegram/auth-middleware';
import {
  ResumeFormatError,
  ResumeParseError,
  ResumeParserUnavailableError,
  ResumeRateLimitError,
} from '@ai-job-bot/core';

/**
 * Free-tier resume parse endpoint.
 *
 * multipart/form-data with `file` (PDF, ≤ 10 MB).
 * Auth'd via the existing initData header flow.
 *
 * Returns a `ParsedResume` JSON on success. Errors map to the four
 * `ResumeParseError` subclasses — the client branches on status code to pick
 * the right inline banner copy (see Profile UI spec §7).
 *
 * The AI-tier parser (OpenAI gpt-5.1, ADR 0006) is NOT wired here — it will
 * live behind a Stars payment gate on a separate route in Phase 4.
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
  // Trust client-declared MIME only as a fast-fail; `unpdf` will reject
  // non-PDFs properly even if the mime says otherwise.
  if (file.type && file.type !== 'application/pdf') {
    return Response.json({ error: 'invalid_mime', mime: file.type }, { status: 415 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const parser = createHeuristicResumeParser();

  try {
    const parsed = await parser.parse({
      pdfBytes: bytes,
      userId: user.id.value,
      filename: file.name,
    });
    // Temporary: log extraction stats on the server so we can correlate
    // "2 fields filled" reports with what the parser actually saw.
    // eslint-disable-next-line no-console
    console.log('parse-resume:', {
      user: user.id.value,
      fileName: file.name,
      fileSize: file.size,
      fullName: parsed.fullName ?? null,
      email: parsed.email ?? null,
      headline: parsed.headline ?? null,
      summaryChars: parsed.summary?.length ?? 0,
      skills: parsed.skills.length,
      experience: parsed.experience.length,
      education: parsed.education.length,
      languages: parsed.languages.length,
    });
    return Response.json(parsed);
  } catch (err) {
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
});
