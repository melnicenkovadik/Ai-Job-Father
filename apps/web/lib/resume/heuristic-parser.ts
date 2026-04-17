import 'server-only';
import {
  type ParsedResume,
  ResumeFormatError,
  ResumeParseError,
  type ResumeParser,
  type ResumeParserInput,
  parseResumeText,
} from '@ai-job-bot/core';
import { extractText } from 'unpdf';

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
    const text = await extractPdfText(input.pdfBytes);
    return parseResumeText(text);
  }
}

export function createHeuristicResumeParser(): ResumeParser {
  return new HeuristicResumeParser();
}

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  try {
    const { text } = await extractText(bytes, { mergePages: true });
    const trimmed = text.trim();
    // Temporary diagnostic: see what unpdf actually got out of the file.
    // eslint-disable-next-line no-console
    console.log('unpdf-extract:', {
      bytes: bytes.length,
      chars: trimmed.length,
      head: trimmed.slice(0, 400).replace(/\n/g, '\\n'),
    });
    if (trimmed.length < 200) {
      throw new ResumeFormatError(
        `Extracted only ${trimmed.length} chars — likely a scanned PDF. Upload a text-based CV or enable AI parse (Stars).`,
      );
    }
    return trimmed;
  } catch (err) {
    if (err instanceof ResumeParseError) throw err;
    throw new ResumeFormatError(`PDF text extraction failed: ${(err as Error).message}`);
  }
}
