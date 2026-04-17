/**
 * Parse a resume PDF into structured `ParsedResume`.
 *
 * Use case is thin on purpose — the AI call lives in the adapter, this
 * layer owns boundary checks and orchestration. Cooldown + file-hash
 * dedup arrive in a follow-up commit once the `ProfileRepo` lookup is
 * wired through.
 *
 * Caller merges the result into a profile draft and shows the user a
 * review screen before persisting via `createProfile` / `updateProfile`.
 */

import {
  type ParsedResume,
  ResumeFormatError,
  type ResumeParser,
  type ResumeParserInput,
} from './ports/resume-parser';

/** 20 MB hard cap as a safety net; the API route should reject earlier at 10 MB. */
const MAX_PDF_BYTES = 20 * 1024 * 1024;
/** PDF signature is `%PDF-` — first 5 bytes must match. */
const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d] as const;

export interface ParseResumeDeps {
  readonly parser: ResumeParser;
}

export async function parseResume(
  deps: ParseResumeDeps,
  input: ResumeParserInput,
): Promise<ParsedResume> {
  if (input.pdfBytes.length === 0) {
    throw new ResumeFormatError('Empty PDF bytes');
  }
  if (input.pdfBytes.length > MAX_PDF_BYTES) {
    throw new ResumeFormatError(`PDF too large: ${input.pdfBytes.length} bytes exceeds 20 MB cap`);
  }
  if (!hasPdfSignature(input.pdfBytes)) {
    throw new ResumeFormatError('File is not a PDF (missing %PDF- signature)');
  }
  return deps.parser.parse(input);
}

function hasPdfSignature(bytes: Uint8Array): boolean {
  if (bytes.length < PDF_SIGNATURE.length) return false;
  for (let i = 0; i < PDF_SIGNATURE.length; i++) {
    if (bytes[i] !== PDF_SIGNATURE[i]) return false;
  }
  return true;
}
