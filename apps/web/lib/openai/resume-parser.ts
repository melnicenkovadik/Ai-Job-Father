import 'server-only';
import {
  type CefrLevel,
  type EducationEntry,
  type ExperienceEntry,
  type LanguageEntry,
  type ParsedResume,
  ResumeFormatError,
  ResumeParseError,
  type ResumeParser,
  type ResumeParserInput,
  ResumeParserUnavailableError,
  ResumeRateLimitError,
  type Skill,
} from '@ai-job-bot/core';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { extractText } from 'unpdf';
import { z } from 'zod';

/**
 * OpenAI adapter for `ResumeParser` (ADR 0006 — gpt-5.1 + Structured Outputs).
 *
 * Flow:
 *   1. Extract text from PDF bytes with `unpdf` (pure-JS, serverless-safe).
 *   2. If the extracted text is < 200 chars, assume a scanned / image-only CV
 *      and raise `ResumeFormatError` — caller shows "fill manually" CTA.
 *      (OCR fallback via OpenAI Files API is a later phase decision.)
 *   3. Send the text to the chat completions endpoint in `.parse()` mode with
 *      `zodResponseFormat` — the SDK enforces strict structured output and
 *      returns the already-validated object on `.parsed`.
 *
 * Errors map as:
 *   - OpenAI 401 / missing key  → `ResumeParserUnavailableError`
 *   - OpenAI 429 / 529          → `ResumeRateLimitError`
 *   - malformed PDF / no text   → `ResumeFormatError`
 *   - anything else             → `ResumeParseError`
 */

const CEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

/**
 * Strict-mode Structured Outputs require every property present in the schema
 * and disallow `.optional()`. We use `.nullable()` everywhere an input may be
 * missing and convert nulls to `undefined` at the Profile-domain boundary.
 */
const ParsedResumeSchema = z.object({
  fullName: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  location: z.string().nullable(),
  linkedinUrl: z.string().nullable(),
  githubUrl: z.string().nullable(),
  portfolioUrl: z.string().nullable(),
  headline: z.string().nullable(),
  summary: z.string().nullable(),
  yearsTotal: z.number().int().nullable(),
  englishLevel: z.enum(CEFR).nullable(),
  skills: z.array(
    z.object({
      name: z.string(),
      years: z.number().nullable(),
      level: z.enum(CEFR).nullable(),
    }),
  ),
  experience: z.array(
    z.object({
      company: z.string(),
      role: z.string(),
      startMonth: z.string(),
      endMonth: z.string().nullable(),
      description: z.string().nullable(),
      stack: z.array(z.string()).nullable(),
    }),
  ),
  education: z.array(
    z.object({
      school: z.string(),
      degree: z.string().nullable(),
      startMonth: z.string().nullable(),
      endMonth: z.string().nullable(),
    }),
  ),
  languages: z.array(
    z.object({
      code: z.string(),
      level: z.enum(CEFR),
    }),
  ),
});

type RawParsedResume = z.infer<typeof ParsedResumeSchema>;

const SYSTEM_PROMPT = `You extract structured resume data from raw CV text.

Rules:
- Only include information that is explicitly present in the text. Never invent, normalize beyond trimming whitespace, or embellish.
- Skill "years": only report if stated, or clearly inferable from non-overlapping experience durations.
- English level (CEFR A1..C2): infer from an explicit statement ("B2 IELTS 6.5", "Advanced / C1", diploma language), otherwise return null.
- Languages array: all spoken languages the CV mentions. Language codes are ISO-639-1 two-letter lowercase ("en", "uk", "ru", "it", "pl", "de", ...).
- Experience: startMonth / endMonth as ISO "YYYY-MM". endMonth null for current roles. Skip entries missing company or role.
- yearsTotal: whole years of non-overlapping professional experience, rounded down. Null if < 1 year or unclear.
- URLs: return verbatim, without prepending "https://".

Return your result ONLY in the provided JSON schema.`;

export class OpenAIResumeParser implements ResumeParser {
  constructor(
    private readonly client: OpenAI,
    private readonly model: string,
  ) {}

  async parse(input: ResumeParserInput): Promise<ParsedResume> {
    const text = await extractPdfText(input.pdfBytes);

    try {
      const completion = await this.client.chat.completions.parse({
        model: this.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserMessage(text, input.languageHint) },
        ],
        response_format: zodResponseFormat(ParsedResumeSchema, 'parsed_resume'),
      });

      const message = completion.choices[0]?.message;
      if (message?.refusal) {
        throw new ResumeParseError(`Model refused: ${message.refusal}`);
      }
      const parsed = message?.parsed;
      if (!parsed) {
        throw new ResumeParseError('OpenAI returned no parsed content');
      }
      return toParsedResume(parsed, this.model);
    } catch (err) {
      if (err instanceof ResumeParseError) throw err;
      if (err instanceof OpenAI.APIError) {
        if (err.status === 401 || err.status === 403) {
          throw new ResumeParserUnavailableError(`OpenAI auth failed: ${err.message}`);
        }
        if (err.status === 429 || err.status === 529) {
          throw new ResumeRateLimitError(`OpenAI rate-limited: ${err.message}`);
        }
        throw new ResumeParseError(`OpenAI API error ${err.status ?? ''}: ${err.message}`);
      }
      throw new ResumeParseError(`Unexpected error: ${(err as Error).message}`);
    }
  }
}

/**
 * Factory: if the key is missing we return a stub parser whose `.parse()` fails
 * with `ResumeParserUnavailableError`. Callers (API routes, UI) check the error
 * type and degrade to the manual-entry path without rendering a generic 500.
 */
export function createOpenAIResumeParser(apiKey: string | undefined, model: string): ResumeParser {
  if (!apiKey) {
    return {
      async parse(): Promise<ParsedResume> {
        throw new ResumeParserUnavailableError(
          'OPENAI_API_KEY is not configured on this deployment.',
        );
      },
    };
  }
  const client = new OpenAI({ apiKey });
  return new OpenAIResumeParser(client, model);
}

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  try {
    const { text } = await extractText(bytes, { mergePages: true });
    const trimmed = text.trim();
    if (trimmed.length < 200) {
      throw new ResumeFormatError(
        `Extracted only ${trimmed.length} chars — likely a scanned PDF. Please upload a text-based CV or fill the profile manually.`,
      );
    }
    return trimmed;
  } catch (err) {
    if (err instanceof ResumeFormatError) throw err;
    throw new ResumeFormatError(`PDF text extraction failed: ${(err as Error).message}`);
  }
}

function buildUserMessage(text: string, hint?: string | undefined): string {
  const langLine = hint ? `User language hint: ${hint}.\n\n` : '';
  return `${langLine}Resume text:\n\n${text}`;
}

function toParsedResume(raw: RawParsedResume, model: string): ParsedResume {
  return {
    fullName: nullToUndefined(raw.fullName),
    email: nullToUndefined(raw.email),
    phone: nullToUndefined(raw.phone),
    location: nullToUndefined(raw.location),
    linkedinUrl: nullToUndefined(raw.linkedinUrl),
    githubUrl: nullToUndefined(raw.githubUrl),
    portfolioUrl: nullToUndefined(raw.portfolioUrl),
    headline: nullToUndefined(raw.headline),
    summary: nullToUndefined(raw.summary),
    yearsTotal: nullToUndefined(raw.yearsTotal),
    englishLevel: nullToUndefined<CefrLevel>(raw.englishLevel),
    skills: raw.skills.map<Skill>((s) => ({
      name: s.name,
      years: s.years ?? undefined,
      level: s.level ?? undefined,
    })),
    experience: raw.experience.map<ExperienceEntry>((e) => ({
      company: e.company,
      role: e.role,
      startMonth: e.startMonth,
      endMonth: e.endMonth,
      description: e.description ?? undefined,
      stack: e.stack ?? undefined,
    })),
    education: raw.education.map<EducationEntry>((e) => ({
      school: e.school,
      degree: e.degree ?? undefined,
      startMonth: e.startMonth ?? undefined,
      endMonth: e.endMonth ?? undefined,
    })),
    languages: raw.languages.map<LanguageEntry>((l) => ({ code: l.code, level: l.level })),
    model,
  };
}

function nullToUndefined<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}
