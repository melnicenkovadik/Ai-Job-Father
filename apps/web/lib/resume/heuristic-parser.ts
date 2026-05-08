import 'server-only';
import {
  type ParsedResume,
  ResumeFormatError,
  ResumeParseError,
  type ResumeParser,
  type ResumeParserInput,
  parseResumeText,
} from '@ai-job-bot/core';
import { extractLinks, extractText } from 'unpdf';

/**
 * Free-tier `ResumeParser` — pure heuristics, no external API calls.
 *
 * Pipeline:
 *   1. Extract text from the PDF with `unpdf` (serverless-safe, pure JS).
 *   2. If the text block is too short (< 200 chars), treat the file as a
 *      scanned / image-only PDF and raise `ResumeFormatError` — the caller
 *      shows a "fill manually or use AI parse (Stars)" CTA.
 *   3. Hand the normalised text to `parseResumeText` in
 *      `packages/core/domain/resume-heuristics`.
 *
 * This adapter is the default in Phase 2. The paid-tier OpenAI adapter
 * (ADR 0006) lives alongside in `apps/web/lib/openai/resume-parser.ts` and
 * is gated behind a Telegram Stars payment wall that lands in Phase 4.
 */
export class HeuristicResumeParser implements ResumeParser {
  async parse(input: ResumeParserInput): Promise<ParsedResume> {
    // Two parallel passes against the same PDF bytes: text + Link
    // annotations. Text alone misses contact URLs that the CV renders
    // as anchor text only ("LinkedIn", "GitHub"). The link pass surfaces
    // those URLs to `parseResumeText` as a fallback, so a profile with
    // hyperlinked contact icons no longer ends up missing linkedinUrl /
    // githubUrl / telegramUrl.
    const text = await extractPdfText(input.pdfBytes);
    const links = await extractPdfLinks(input.pdfBytes);
    return parseResumeText(text, links);
  }
}

export function createHeuristicResumeParser(): ResumeParser {
  return new HeuristicResumeParser();
}

/**
 * Pull every `Link` annotation URL out of the PDF. Best-effort: a
 * failure here just degrades to "no link fallback", the text path
 * still runs unchanged.
 */
async function extractPdfLinks(bytes: Uint8Array): Promise<string[]> {
  try {
    // unpdf transfers the buffer to a worker; pass a fresh copy so the
    // earlier extractText() call doesn't leave us with a detached view.
    const safe = new Uint8Array(bytes);
    const result = await extractLinks(safe);
    // unpdf returns either { links: [...] } or a string array depending
    // on the version; normalise to a string list.
    const raw = (result as { links?: unknown }).links ?? (result as unknown);
    if (!Array.isArray(raw)) return [];
    return raw.filter((u): u is string => typeof u === 'string' && u.length > 0);
  } catch (err) {
    // Best-effort — losing the URL fallback is not fatal. Surface it in
    // the dev console so a regression is visible during local runs;
    // production failure is invisible by design (parse still succeeds).
    if (typeof console !== 'undefined') {
      console.warn('[heuristic-parser] extractLinks failed:', err);
    }
    return [];
  }
}

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  try {
    // mergePages:false keeps intra-page line breaks (so section headers like
    // "EXPERIENCE", "EDUCATION" stay on their own lines and the section-splitter
    // can find them). mergePages:true collapses every line into one — bad for
    // section detection on real PDFs. We rejoin pages with a blank line so the
    // splitter can still treat the doc as a single text blob.
    const { text } = await extractText(bytes, { mergePages: false });
    const pages = Array.isArray(text) ? text : [text];
    const joined = pages
      .map((p) => String(p).trim())
      .join('\n\n')
      .trim();
    if (joined.length < 200) {
      throw new ResumeFormatError(
        `Extracted only ${joined.length} chars — likely a scanned PDF. Upload a text-based CV or enable AI parse (Stars).`,
      );
    }
    return joined;
  } catch (err) {
    if (err instanceof ResumeParseError) throw err;
    throw new ResumeFormatError(`PDF text extraction failed: ${(err as Error).message}`);
  }
}
