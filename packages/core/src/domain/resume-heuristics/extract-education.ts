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
const YEAR_RANGE_MM_YY_RE = /\b(\d{4})-\d{2}\s*[—–\-]\s*\b(\d{4})-\d{2}\b/;
const SINGLE_YEAR_RE = /\b(\d{4})\b/;
const PARENTHESISED_YEAR_RE = /\((\d{4})\)/;

export function extractEducation(educationBody: string): readonly EducationEntry[] {
  const body = educationBody.trim();
  if (body.length === 0) return [];

  // Primary split: blank lines.
  let chunks = body
    .split(/\n\s*\n+/)
    .map((c) => c.trim())
    .filter(Boolean);

  // If only one chunk emerged but the body has multiple "Bachelor/Master/PhD"
  // mentions, split on each degree marker so each entry is its own chunk.
  if (chunks.length === 1 && chunks[0]) {
    const degreeSplit = splitOnDegreeMarkers(chunks[0]);
    if (degreeSplit.length > 1) chunks = degreeSplit;
  }

  const out: EducationEntry[] = [];
  for (const chunk of chunks) {
    const parsed = parseEducationEntry(chunk);
    if (parsed) out.push(parsed);
    if (out.length >= MAX_ENTRIES) break;
  }
  return out;
}

/**
 * Split a multi-entry education block on each line that contains a degree
 * marker. Only triggers when there are at least 2 such lines — otherwise the
 * body is a single entry where the degree+school are split across lines and
 * shouldn't be cut.
 */
function splitOnDegreeMarkers(text: string): string[] {
  const lines = text.split('\n');
  const markerLines: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (DEGREE_KEYWORDS.test(line)) markerLines.push(i);
  }
  if (markerLines.length < 2) return [text];

  const chunks: string[] = [];
  for (let i = 0; i < markerLines.length; i++) {
    const start = i === 0 ? 0 : (markerLines[i] as number);
    const end = (markerLines[i + 1] ?? lines.length) as number;
    const chunk = lines.slice(start, end).join('\n').trim();
    if (chunk) chunks.push(chunk);
  }
  return chunks;
}

const DEGREE_KEYWORDS =
  /\b(master'?s?|bachelor'?s?|phd|doctorate|doctor|diploma|bsc|msc|mba|ba|ma|степінь|ступінь|ступень|степень|магістр|магистр|бакалавр|laurea|magistrale|licenciatura|licencjat|magister|inżynier)\b/iu;

function parseEducationEntry(chunk: string): EducationEntry | null {
  const { startMonth, endMonth, text } = stripDates(chunk);
  const fragments = text
    .split(/\n|\s*[—–|•·]\s*|\s*,\s*/)
    .map((l) =>
      l
        .replace(/^[\s,;:•·]+|[\s,;:•·]+$/g, '')
        .replace(/^\s*[\-–—]\s*|\s*[\-–—]\s*$/g, '')
        .trim(),
    )
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
  // YYYY-MM - YYYY-MM
  const mmYY = YEAR_RANGE_MM_YY_RE.exec(chunk);
  if (mmYY?.[0] && mmYY[1] && mmYY[2]) {
    const text = chunk.replace(mmYY[0], '').trim();
    return { startMonth: `${mmYY[1]}-01`, endMonth: `${mmYY[2]}-01`, text };
  }
  // YYYY - YYYY
  const range = YEAR_RANGE_RE.exec(chunk);
  if (range?.[1] && range[2]) {
    const text = chunk.replace(range[0], '').trim();
    return { startMonth: `${range[1]}-01`, endMonth: `${range[2]}-01`, text };
  }
  // (YYYY) — graduation year only
  const paren = PARENTHESISED_YEAR_RE.exec(chunk);
  if (paren?.[1]) {
    const text = chunk.replace(paren[0], '').trim();
    return { startMonth: undefined, endMonth: `${paren[1]}-01`, text };
  }
  // Single 4-digit year
  const single = SINGLE_YEAR_RE.exec(chunk);
  if (single?.[1]) {
    const text = chunk.replace(single[0], '').trim();
    return { startMonth: `${single[1]}-01`, endMonth: undefined, text };
  }
  return { startMonth: undefined, endMonth: undefined, text: chunk };
}
