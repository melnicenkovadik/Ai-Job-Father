/**
 * Skills extraction from the `skills` section body.
 *
 * The section is typically a flat list with `,` `·` `|` `;` or newline as
 * delimiter. Each chunk may carry an explicit years hint in parentheses
 * ("React (5 years)") or as a suffix ("React 5y"); we clamp years to 0..30
 * and drop any value outside that range.
 */

import type { Skill } from '../profile';

const SKILL_DELIMITERS = /[,•·|;]+/;
const TOP_LEVEL_DELIMITERS = new Set([',', '•', '·', '|', ';']);
/**
 * "Frontend:", "AI & LLM Integration:", "Стек:" — category prefixes seen in
 * almost every tech CV. Stripping the prefix before the per-chunk split keeps
 * "Frontend" out of the skill list; only the items after the colon end up
 * as chips.
 */
const CATEGORY_PREFIX_RE = /^[A-Za-zА-Яа-яІіЇїЄєҐґ][A-Za-zА-Яа-яІіЇїЄєҐґ0-9 &/\-]{0,50}:\s+(.+)$/u;
/** "(5)" / "(5 years)" / "(5+ years)" / "(5 лет)" / "(-5)" — years in parens. */
const YEARS_IN_PARENS = /\((-?\d{1,2})\s*\+?\s*(?:yrs?|years?|y|г|лет|років|рік|anni|lat)?\s*\)/iu;
/**
 * "5y" / "5+ years" / "5 лет" / "5 років" — suffix form.
 * `\b` in ECMA regex ignores Cyrillic letters even with `u`, so the trailing
 * boundary is expressed via a Unicode-aware negative lookahead on `\p{L}`.
 */
const YEARS_SUFFIX =
  /(?<!\p{L})(\d{1,2})\s*\+?\s*(?:yrs?|years?|y|лет|років|рік|anni|lat)(?!\p{L})/iu;
const MAX_SKILL_NAME = 40;
const MAX_SKILLS = 50;
const MAX_YEARS = 30;

export function extractSkills(skillsBody: string): readonly Skill[] {
  const body = skillsBody.trim();
  if (body.length === 0) return [];

  // Line-by-line: strip any "Category: " prefix, then split the rest.
  // This keeps "Frontend" out of the chip list for the common layout
  // `Frontend: React, Next.js, TypeScript…`. We split top-level only —
  // commas inside `(...)` stay with the skill so things like
  // "Next.js (SSR, Code Splitting)" don't shatter into 3 skills, two of
  // which (`Code Splitting`, `Lazy Loading)`) are nonsense.
  const chunks: string[] = [];
  for (const rawLine of body.split('\n')) {
    const line = stripBulletPrefix(rawLine).trim();
    if (line.length === 0) continue;
    const stripped = CATEGORY_PREFIX_RE.exec(line)?.[1] ?? line;
    for (const part of splitTopLevel(stripped)) {
      const trimmed = stripBulletPrefix(part).trim();
      if (trimmed.length > 0) chunks.push(trimmed);
    }
  }

  const seen = new Set<string>();
  const out: Skill[] = [];
  for (const raw of chunks) {
    const parsed = parseSkillChunk(raw);
    if (!parsed) continue;
    const dedupKey = parsed.name.toLowerCase();
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);
    out.push(parsed);
    if (out.length >= MAX_SKILLS) break;
  }
  return out;
}

function parseSkillChunk(chunk: string): Skill | null {
  let years: number | undefined;
  let name = chunk;

  const parens = YEARS_IN_PARENS.exec(chunk);
  if (parens?.[1]) {
    years = clampYears(Number.parseInt(parens[1], 10));
    name = chunk.replace(YEARS_IN_PARENS, '').trim();
  } else {
    const suffix = YEARS_SUFFIX.exec(chunk);
    if (suffix?.[1]) {
      years = clampYears(Number.parseInt(suffix[1], 10));
      name = chunk.replace(YEARS_SUFFIX, '').trim();
    }
  }

  // "Next.js (SSR, Code Splitting, Lazy Loading)" — drop the parenthesised
  // detail; the chip list shouldn't carry sub-feature soup. Years-in-parens
  // (handled above) already stripped their own match. Strip any other
  // unmatched leading/trailing parentheses left over from NUL recovery
  // ("Lazy Loading)" with a stray closing paren, "(SSR" with stray opening).
  name = name.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  name = name.replace(/^[()\s]+|[()\s]+$/g, '').trim();

  name = name.replace(/[\s:·—–-]+$/, '').trim();
  if (name.length === 0 || name.length > MAX_SKILL_NAME) return null;
  return years !== undefined ? { name, years } : { name };
}

/**
 * Comma-/bullet-/pipe-split that respects parentheses. "A (B, C), D" →
 * `["A (B, C)", "D"]`. Falls back gracefully on unbalanced input — an
 * unclosed `(` is treated as if depth never opened so we don't swallow
 * the rest of the line into one chunk.
 */
function splitTopLevel(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i] ?? '';
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth = Math.max(0, depth - 1);
    else if (depth === 0 && TOP_LEVEL_DELIMITERS.has(c)) {
      out.push(text.slice(start, i));
      start = i + 1;
    }
  }
  out.push(text.slice(start));
  return out;
}

function stripBulletPrefix(s: string): string {
  return s.replace(/^[\s•·*\-–—]+/, '');
}

function clampYears(n: number): number | undefined {
  if (!Number.isFinite(n) || n < 0 || n > MAX_YEARS) return undefined;
  return n;
}
