/**
 * Heuristic extraction of name, headline, and summary from the pre-heading
 * "header" block of a CV.
 *
 * All three fields are optional — if nothing fits the shape we bail out and
 * the user fills it in. Optimising for "no wrong data" > "something extracted".
 */

export interface NameHeadlineSummary {
  readonly fullName?: string | undefined;
  readonly headline?: string | undefined;
  readonly summary?: string | undefined;
}

const MAX_NAME_LENGTH = 60;
const MIN_NAME_WORDS = 2;
const MAX_NAME_WORDS = 5;
const MIN_HEADLINE_LENGTH = 5;
const MAX_HEADLINE_LENGTH = 120;
const MAX_SUMMARY_LENGTH = 800;

export function extractNameHeadlineSummary(
  headerBody: string,
  summarySection: string,
): NameHeadlineSummary {
  const lines = headerBody
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const name = findName(lines);
  const headline = findHeadline(lines, name);
  const summary = summarySection.trim().length > 0 ? truncateSummary(summarySection) : undefined;

  return stripUndefined({ fullName: name, headline, summary });
}

function findName(lines: readonly string[]): string | undefined {
  for (const line of lines) {
    if (looksLikeContactLine(line)) continue;
    if (line.length > MAX_NAME_LENGTH || line.length < 2) continue;
    if (/\d/.test(line)) continue;
    const words = line.split(/\s+/);
    if (words.length < MIN_NAME_WORDS || words.length > MAX_NAME_WORDS) continue;
    const upperStarts = words.filter((w) => startsWithUppercase(w)).length;
    if (upperStarts < 2) continue;
    return line;
  }
  return undefined;
}

function findHeadline(lines: readonly string[], name: string | undefined): string | undefined {
  let foundName = name === undefined;
  for (const line of lines) {
    if (looksLikeContactLine(line)) continue;
    if (!foundName) {
      if (line === name) foundName = true;
      continue;
    }
    if (name !== undefined && line === name) continue;
    if (line.length < MIN_HEADLINE_LENGTH || line.length > MAX_HEADLINE_LENGTH) continue;
    return line;
  }
  return undefined;
}

function looksLikeContactLine(line: string): boolean {
  if (/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(line)) return true;
  if (/https?:\/\//i.test(line)) return true;
  if (/\b(?:linkedin|github|twitter|t\.me|telegram)\./i.test(line)) return true;
  if (/\+?\d[\d\s().-]{6,}\d/.test(line)) {
    const digits = line.replace(/\D/g, '');
    if (digits.length >= 7 && digits.length <= 15) return true;
  }
  return false;
}

function startsWithUppercase(word: string): boolean {
  const first = word[0];
  if (!first) return false;
  return first === first.toUpperCase() && first !== first.toLowerCase();
}

function truncateSummary(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= MAX_SUMMARY_LENGTH) return cleaned;
  return `${cleaned.slice(0, MAX_SUMMARY_LENGTH - 1)}…`;
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as T;
}
