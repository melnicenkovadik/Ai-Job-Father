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

const SYSTEM_PROMPT = `You extract structured resume data from a PDF CV.

The PDF is attached. Read the whole document, including headers, sidebars,
contact blocks, embedded hyperlinks, and categorised lists.

## Hard rule — never invent

Only include information that is EXPLICITLY present in the document.
Never invent, guess, paraphrase, infer, reconstruct "what the candidate
probably meant", or reasonably fill in missing data. If a field is not
in the CV, leave it null / empty. Under-extraction is always better
than hallucination. This applies to every field: name, email, phone,
URLs, location, yearsTotal, CEFR levels, skills, roles, companies,
dates, descriptions — everything. Plain "not in the CV" → null.

## Per-field rules

- Skills: extract EVERY technical skill, tool, framework, library, language, platform or service mentioned anywhere in the CV. When the CV groups them under categories ("Frontend:", "AI & LLM Integration:", "Blockchain:", "Styling:", "Testing & CI/CD:", "Backend & Tools:", "Data Visualization:", "Soft Skills:", …), include every item from every group. Return the full list up to 50 items. Do NOT include the category label itself as a skill.
- Skills ORDER matters: put the items most relevant to the candidate's headline FIRST. For a "Senior Frontend Developer" headline, that means React / Next.js / TypeScript / state management / CSS frameworks before databases, DevOps, or mobile-only tooling. Primary-skill-first order is a quality signal; do not alphabetise.
- Skill "years": only report if stated next to the item, or clearly inferable from non-overlapping experience durations.
- Experience: every work entry the CV lists — including contracts and short roles. startMonth / endMonth as ISO "YYYY-MM". endMonth null for current / "Present" roles. Skip entries missing company or role.
- Education: all degrees listed, with school + degree + years where present.
- Languages: spoken languages with CEFR levels A1..C2. Native markers → C2. Language codes are ISO-639-1 two-letter lowercase ("en", "uk", "ru", "it", "pl", "de", "fr", "es"…).
- English level (top-level field): mirror the English entry's CEFR level from the languages array if present.
- yearsTotal: whole years of non-overlapping professional experience, rounded down. Null if < 1 year or unclear.
- Location: extract city / country / "remote" when the CV shows it in the header, contact block, or a "Based in X" line.
- Contacts: fullName (usually the top-of-page name), email, phone (keep original formatting), fullName, headline (the role title line right after the name, e.g. "Senior Frontend Developer").
- URLs: linkedinUrl / githubUrl / portfolioUrl — return the FULL absolute URL. If the PDF shows a clickable hyperlink behind the text (e.g. "LinkedIn" links to https://linkedin.com/in/…), return that hyperlink target. If only a handle is visible ("github.com/foo"), prepend "https://".

Return your result ONLY in the provided JSON schema.`;

export class OpenAIResumeParser implements ResumeParser {
  constructor(
    private readonly client: OpenAI,
    private readonly model: string,
  ) {}

  async parse(input: ResumeParserInput): Promise<ParsedResume> {
    // Upload the PDF to OpenAI as a user_data file so the model can read
    // the full document — text, layout, and embedded hyperlinks — not just
    // the linearised text unpdf extracts.
    const uploaded = await this.uploadPdf(input);

    try {
      const completion = await this.client.chat.completions.parse({
        model: this.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'file', file: { file_id: uploaded.id } },
              { type: 'text', text: buildUserMessage(input.languageHint) },
            ],
          },
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
    } finally {
      // Best-effort cleanup — don't fail the request if file delete errors.
      this.client.files.delete(uploaded.id).catch(() => undefined);
    }
  }

  private async uploadPdf(input: ResumeParserInput): Promise<{ id: string }> {
    try {
      const file = new File(
        [input.pdfBytes as BlobPart],
        input.filename ?? 'resume.pdf',
        { type: 'application/pdf' },
      );
      const uploaded = await this.client.files.create({ file, purpose: 'user_data' });
      return { id: uploaded.id };
    } catch (err) {
      if (err instanceof OpenAI.APIError) {
        if (err.status === 401 || err.status === 403) {
          throw new ResumeParserUnavailableError(`OpenAI auth failed on upload: ${err.message}`);
        }
        if (err.status === 413) {
          throw new ResumeFormatError(`PDF too large for OpenAI upload: ${err.message}`);
        }
        if (err.status === 429 || err.status === 529) {
          throw new ResumeRateLimitError(`OpenAI rate-limited on upload: ${err.message}`);
        }
      }
      throw new ResumeParseError(`PDF upload to OpenAI failed: ${(err as Error).message}`);
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

function buildUserMessage(hint?: string | undefined): string {
  const langLine = hint ? `User language hint: ${hint}. ` : '';
  return `${langLine}Extract the full structured profile from the attached PDF CV following the system rules.`;
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
