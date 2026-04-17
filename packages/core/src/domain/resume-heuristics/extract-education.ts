/**
 * Education extraction from the `education` section body.
 *
 * Each entry is a blank-line-separated chunk. First non-date line → `school`,
 * second non-date line (if any) → `degree`. Dates (YYYY / YYYY-YYYY) become
 * `startMonth` / `endMonth` (normalised to YYYY-01 when month is missing).
 */

import type { EducationEntry } from '../profile';

const MAX_ENTRIES = 10;
const YEAR_RANGE_RE = /\b(\d{4})\s*[—–\-]\s*(\d{4})\b/;
const SINGLE_YEAR_RE = /\b(\d{4})\b/;

export function extractEducation(educationBody: string): readonly EducationEntry[] {
  const body = educationBody.trim();
  if (body.length === 0) return [];

  const chunks = body
    .split(/\n\s*\n+/)
    .map((c) => c.trim())
    .filter(Boolean);

  const out: EducationEntry[] = [];
  for (const chunk of chunks) {
    const parsed = parseEducationEntry(chunk);
    if (parsed) out.push(parsed);
    if (out.length >= MAX_ENTRIES) break;
  }
  return out;
}

const DEGREE_KEYWORDS =
  /\b(master'?s?|bachelor'?s?|phd|doctorate|doctor|diploma|bsc|msc|mba|ba|ma|степінь|ступінь|ступень|степень|магістр|магистр|бакалавр|laurea|magistrale|licenciatura|licencjat|magister|inżynier)\b/iu;

function parseEducationEntry(chunk: string): EducationEntry | null {
  const { startMonth, endMonth, text } = stripDates(chunk);
  const fragments = text
    .split(/\n|\s*[—–|]\s*|\s*,\s*/)
    .map((l) => l.replace(/^[\s,;:]+|[\s,;:]+$/g, '').trim())
    .filter((l) => l.length > 0 && l.length <= 120);
  if (fragments.length === 0) return null;

  // Heuristic: if the first fragment looks like a degree ("Master's in …",
  // "BSc", "Бакалавр") and the second looks like a place, swap them so
  // `school` always carries the institution.
  let school: string | undefined;
  let degree: string | undefined;
  const first = fragments[0];
  const second = fragments[1];
  if (first && second && DEGREE_KEYWORDS.test(first) && !DEGREE_KEYWORDS.test(second)) {
    degree = first;
    school = second;
  } else {
    school = first;
    degree = second;
  }

  if (!school) return null;
  return {
    school,
    ...(degree !== undefined ? { degree } : {}),
    ...(startMonth !== undefined ? { startMonth } : {}),
    ...(endMonth !== undefined ? { endMonth } : {}),
  };
}

function stripDates(chunk: string): {
  readonly startMonth: string | undefined;
  readonly endMonth: string | undefined;
  readonly text: string;
} {
  const range = YEAR_RANGE_RE.exec(chunk);
  if (range?.[1] && range[2]) {
    const text = chunk.replace(range[0], '').trim();
    return { startMonth: `${range[1]}-01`, endMonth: `${range[2]}-01`, text };
  }
  const single = SINGLE_YEAR_RE.exec(chunk);
  if (single?.[1]) {
    const text = chunk.replace(single[0], '').trim();
    return { startMonth: `${single[1]}-01`, endMonth: undefined, text };
  }
  return { startMonth: undefined, endMonth: undefined, text: chunk };
}
