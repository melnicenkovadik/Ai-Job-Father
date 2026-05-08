/**
 * Orchestrator: plain-text CV → `ParsedResume`.
 *
 * Composes the five extractors against a single pass of the text. The
 * heuristic never returns an error — anything it can't parse becomes
 * `undefined` / empty arrays and the user fills gaps in the review step.
 *
 * Identified by `model: "heuristic-v1"` so downstream consumers can tell
 * "cheap" (free-tier) output from "rich" (AI-tier) output.
 */

import type { ParsedResume } from '../../application/ports/resume-parser';
import type { ExperienceEntry } from '../profile';
import { extractContacts } from './extract-contacts';
import { extractEducation } from './extract-education';
import { extractExperience } from './extract-experience';
import { extractLanguages } from './extract-languages';
import { classifyLinks } from './extract-links';
import { extractNameHeadlineSummary } from './extract-name';
import { extractSkills } from './extract-skills';
import { findAllSectionBodies, findSectionBody, splitIntoSections } from './section-split';

export const HEURISTIC_MODEL_ID = 'heuristic-v1';

/**
 * @param text  Plain-text CV body, as extracted by `unpdf.extractText`.
 * @param links Optional URL annotations from the source PDF
 *              (`unpdf.extractLinks`). Anchor text on real-world CVs
 *              ("LinkedIn", "GitHub", "Telegram") hides the actual URL
 *              behind a Link annotation; the text path can't recover
 *              it. When supplied, `parseResumeText` classifies the
 *              URLs by host and uses them as a *fallback* when the
 *              text-based extractor came up empty for a given field.
 */
export function parseResumeText(text: string, links?: readonly string[]): ParsedResume {
  const normalized = normalize(text);
  const sections = splitIntoSections(normalized);

  const header = findSectionBody(sections, 'header');
  const summaryBody = findSectionBody(sections, 'summary');
  const contacts = extractContacts(normalized);
  // PDF Link annotations carry URLs that anchor text alone hides
  // ("LinkedIn" → linkedin.com/in/handle). Classify them and use as
  // FALLBACK only — the text-based extractor wins when both fire.
  const linkBuckets = links && links.length > 0 ? classifyLinks(links) : null;
  // If the section-splitter ate the header (e.g. line 0 is a category label
  // that matches a section heading), fall back to the first 10 lines of the
  // text so name+headline can still be extracted.
  const nameHeaderInput = header.length > 30 ? header : firstNonEmptyLines(normalized, 10);
  const { fullName, headline, summary } = extractNameHeadlineSummary(nameHeaderInput, summaryBody);

  const skills = extractSkills(findAllSectionBodies(sections, 'skills'));
  const languages = extractLanguages(findAllSectionBodies(sections, 'languages'));
  const experience = extractExperience(findAllSectionBodies(sections, 'experience'));
  const education = extractEducation(findAllSectionBodies(sections, 'education'));
  const yearsTotal = computeYearsTotal(experience);
  const englishLevel = languages.find((l) => l.code === 'en')?.level;

  return {
    fullName,
    email: contacts.email ?? linkBuckets?.email,
    phone: contacts.phone,
    linkedinUrl: contacts.linkedinUrl ?? linkBuckets?.linkedinUrl,
    githubUrl: contacts.githubUrl ?? linkBuckets?.githubUrl,
    portfolioUrl: contacts.portfolioUrl ?? linkBuckets?.portfolioUrl,
    telegramUrl: linkBuckets?.telegramUrl,
    twitterUrl: linkBuckets?.twitterUrl,
    location: contacts.location,
    headline,
    summary,
    yearsTotal,
    englishLevel,
    skills,
    experience,
    education,
    languages,
    model: HEURISTIC_MODEL_ID,
  };
}

function computeYearsTotal(experience: readonly ExperienceEntry[]): number | undefined {
  if (experience.length === 0) return undefined;
  const now = new Date();
  let totalMonths = 0;
  for (const exp of experience) {
    const start = parseMonth(exp.startMonth);
    const end = exp.endMonth ? parseMonth(exp.endMonth) : now;
    if (!start || !end) continue;
    const diff =
      (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    if (diff > 0) totalMonths += diff;
  }
  if (totalMonths < 12) return undefined;
  return Math.min(80, Math.floor(totalMonths / 12));
}

function parseMonth(ym: string): Date | null {
  const m = /^(\d{4})-(\d{2})$/.exec(ym);
  if (!m?.[1] || !m[2]) return null;
  const year = Number.parseInt(m[1], 10);
  const month = Number.parseInt(m[2], 10);
  if (month < 1 || month > 12) return null;
  return new Date(Date.UTC(year, month - 1, 1));
}

/*
 * NOTE: every regex in `normalize` deliberately matches U+0000 / C0 control
 * bytes. Biome's `noControlCharactersInRegex` would normally reject this.
 * Each line that constructs such a regex carries an inline ignore comment.
 */
function normalize(text: string): string {
  return (
    text
      // First: context-aware NUL recovery. Some PDF fonts ship without a
      // ToUnicode map for en-dashes, parentheses, and the tilde / \u2248 glyph;
      // unpdf emits U+0000 in their place. Naively stripping NULs collapses
      // "May 2025 \u2013 Present" into "May 2025  Present" (date range broken)
      // and "(B1)" into "B1" (which slips into "B1Vadym" if the next word
      // hugs the closing paren \u2014 the CEFR regex then can't tell where B1
      // ends and falls back to "intermediate \u2192 B2"). Map the most common
      // shapes back to the right ASCII glyph instead.
      // 1. "word<NUL>\nword" \u2192 soft hyphen + line break.
      //    "AI<NUL>\npowered" is the PDF's hyphenation point, not a paren.
      // biome-ignore lint/suspicious/noControlCharactersInRegex: NUL recovery
      .replace(/(\w)\x00\n(\w)/g, '$1-\n$2')
      // 2. "Letter<NUL> Uppercase List..." \u2192 category prefix colon.
      //    Catches "Mapping & GIS<NUL> Mapbox, Leaflet", "Languages<NUL>
      //    English, Italian". Lookahead requires the next token to be
      //    followed by another word (comma or space+word) so a bare
      //    "Vadym<NUL> Melnychenko" (name pair, single word follows)
      //    falls through to rule 7 and the NUL is just dropped.
      //    "May 2025<NUL> Present" is digit-flush and skips this anyway.
      // biome-ignore lint/suspicious/noControlCharactersInRegex: NUL recovery
      .replace(/(\p{L})\x00(?=\s+\p{Lu}\w*[ ,]\s*\w)/gu, '$1:')
      // 3. " <NUL>word" (NUL hugging the start of a token) \u2192 " (word".
      //    "Next.js <NUL>SSR" \u2192 "Next.js (SSR". Runs before en-dash so
      //    the paren reading wins when the NUL is flush against the word.
      // biome-ignore lint/suspicious/noControlCharactersInRegex: NUL recovery
      .replace(/(\s)\x00(?=\w)/g, '$1(')
      // 4. "word<NUL>" before whitespace, EOL, or punctuation \u2192 "word)".
      // biome-ignore lint/suspicious/noControlCharactersInRegex: NUL recovery
      .replace(/(\w)\x00(?=\s|$|[,;.!?:])/g, '$1)')
      // 5. "word<NUL>word" with no space \u2192 "word)word" closes the paren
      //    ("(B1<NUL>Vadym" \u2192 "(B1)Vadym").
      // biome-ignore lint/suspicious/noControlCharactersInRegex: NUL recovery
      .replace(/(\w)\x00(?=\w)/g, '$1)')
      // 6. " <NUL> " (NUL alone between spaces) \u2192 " \u2013 " (en-dash). Last
      //    resort for surviving NULs \u2014 only the date-separator pattern
      //    "May 2025 <NUL> Present" / "2012 <NUL> 2018" reaches here.
      // biome-ignore lint/suspicious/noControlCharactersInRegex: NUL recovery
      .replace(/(\S) ?\x00 ?(\S)/g, '$1 \u2013 $2')
      // 7. Anything else (other C0 controls except \t \n \r) \u2192 drop.
      // biome-ignore lint/suspicious/noControlCharactersInRegex: NUL recovery
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .replace(/\r\n?/g, '\n')
      // 8. PDFs that ship without explicit breaks fuse the role-date line
      //    with the description's first word: "May 2025 \u2013 PresentFintech
      //    platform\u2026", "Aug 2024 \u2013 Apr 2025 (9 months)Worked on\u2026". The
      //    experience extractor's header detector then sees a long line,
      //    classifies it as description, and loses the company/role pair
      //    sitting two lines earlier. Insert a newline after the
      //    parenthesised duration or "Present/Current/Now/\u2026" when the
      //    next char is "Capital + lowercase" (sentence start).
      .replace(/(\(\s*\d+\s+(?:months?|years?|yrs?|mo|mos)\s*\))(?=[A-Z][a-z])/g, '$1\n')
      .replace(
        /\b(Present|Current|Currently|Now|Ongoing|Today|\u043D\u0438\u043D\u0456|\u0437\u0430\u0440\u0430\u0437|\u043D\u0430\u0441\u0442\u043E\u044F\u0449\u0435\u0435|attuale|obecnie|oggi|teraz)(?=[A-Z][a-z])/g,
        '$1\n',
      )
      .replace(/[ \t\u00A0]+/g, ' ')
      .trim()
      // Final pass: trim unbalanced trailing `)` per line. NUL\u2192`)`
      // recovery is the right read inside a real PDF (every `(` had a
      // matching `)` originally), but synthetic NUL pollution
      // ("Vadym<NUL> Melnychenko" in tests) leaves a stray closer that
      // would land in a name. Drop them line-by-line if no matching `(`.
      .split('\n')
      .map(balanceParens)
      .join('\n')
  );
}

/**
 * Strip orphaned trailing `)` on a single line. We only delete from the
 * end so legitimately mid-string close-parens stay (e.g. "(contract)").
 */
function balanceParens(line: string): string {
  let opens = 0;
  let closes = 0;
  for (const c of line) {
    if (c === '(') opens++;
    else if (c === ')') closes++;
  }
  if (closes <= opens) return line;
  let extras = closes - opens;
  let result = '';
  for (let i = line.length - 1; i >= 0; i--) {
    const c = line[i] as string;
    if (c === ')' && extras > 0) {
      extras--;
      continue;
    }
    result = c + result;
  }
  return result;
}

/** First N non-empty lines. Used as fallback header when section-split ate it. */
function firstNonEmptyLines(text: string, n: number): string {
  const out: string[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    out.push(trimmed);
    if (out.length >= n) break;
  }
  return out.join('\n');
}
