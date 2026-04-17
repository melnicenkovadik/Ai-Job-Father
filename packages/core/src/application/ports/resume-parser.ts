/**
 * ResumeParser port — PDF bytes → structured `ParsedResume`.
 *
 * Adapters:
 *   - `apps/web/lib/openai/resume-parser.ts` — real adapter (Phase 2).
 *     Uses OpenAI gpt-5.1 + structured outputs; PDF→text via `unpdf`
 *     (fallback to direct PDF upload via the Files API if text extraction
 *     yields < 200 chars, which usually means a scanned/image CV).
 *   - `packages/core/test/fakes/fake-resume-parser.ts` — canned-response
 *     in-memory parser for use-case tests.
 *
 * The parser never touches the DB. Callers merge `ParsedResume` into a
 * profile draft through `profileRepo.update()`/`create()` and let the
 * human review before saving.
 *
 * AI model choice: tracked in `docs/DECISIONS/0006-openai-resume-parser.md`.
 */

import type {
  CefrLevel,
  EducationEntry,
  ExperienceEntry,
  LanguageEntry,
  Skill,
} from '../../domain/profile';

export interface ResumeParserInput {
  /**
   * Raw PDF bytes. Max 10 MB — enforced at the API route boundary; the
   * parser itself rejects anything over 20 MB as a safety net (Phase 2
   * adapter constant).
   */
  readonly pdfBytes: Uint8Array;
  /** For provenance — stored in telemetry, not sent to the model. */
  readonly userId: string;
  /** Original filename — helps the parser pick a language prior when mixed. */
  readonly filename?: string | undefined;
  /** ISO-639-1 two-letter code, e.g. "en", "uk". Bias only; model may override. */
  readonly languageHint?: string | undefined;
}

/**
 * Structured CV content. Every field is optional except the four array
 * members — the parser returns `[]` when a section is absent rather than
 * undefined, so the merge-into-draft step stays trivial.
 */
export interface ParsedResume {
  readonly fullName?: string | undefined;
  readonly email?: string | undefined;
  readonly phone?: string | undefined;
  readonly location?: string | undefined;
  readonly linkedinUrl?: string | undefined;
  readonly githubUrl?: string | undefined;
  readonly portfolioUrl?: string | undefined;
  readonly headline?: string | undefined;
  readonly summary?: string | undefined;
  readonly yearsTotal?: number | undefined;
  readonly englishLevel?: CefrLevel | undefined;
  readonly skills: readonly Skill[];
  readonly experience: readonly ExperienceEntry[];
  readonly education: readonly EducationEntry[];
  readonly languages: readonly LanguageEntry[];
  /** Identifier of the model that produced this output, e.g. "gpt-5.1". */
  readonly model: string;
}

export class ResumeParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResumeParseError';
  }
}

/** Bad file: not a PDF, corrupt, zero pages, over size limit. Caller retries with a new file. */
export class ResumeFormatError extends ResumeParseError {
  constructor(message: string) {
    super(message);
    this.name = 'ResumeFormatError';
  }
}

/** Model vendor is rate-limiting or temporarily down. Retryable with backoff. */
export class ResumeRateLimitError extends ResumeParseError {
  constructor(message: string) {
    super(message);
    this.name = 'ResumeRateLimitError';
  }
}

/** Adapter dependency (API key) is missing. Caller should degrade to manual entry. */
export class ResumeParserUnavailableError extends ResumeParseError {
  constructor(message: string) {
    super(message);
    this.name = 'ResumeParserUnavailableError';
  }
}

export interface ResumeParser {
  parse(input: ResumeParserInput): Promise<ParsedResume>;
}
