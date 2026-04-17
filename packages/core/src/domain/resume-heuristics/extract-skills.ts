/**
 * Skills extraction from the `skills` section body.
 *
 * The section is typically a flat list with `,` `·` `|` `;` or newline as
 * delimiter. Each chunk may carry an explicit years hint in parentheses
 * ("React (5 years)") or as a suffix ("React 5y"); we clamp years to 0..30
 * and drop any value outside that range.
 */

import type { Skill } from '../profile';

const SKILL_DELIMITERS = /[,•·|;\n]+/;
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
  const chunks = body
    .split(SKILL_DELIMITERS)
    .map((p) => stripBulletPrefix(p).trim())
    .filter(Boolean);

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

  name = name.replace(/[\s:·—–-]+$/, '').trim();
  if (name.length === 0 || name.length > MAX_SKILL_NAME) return null;
  return years !== undefined ? { name, years } : { name };
}

function stripBulletPrefix(s: string): string {
  return s.replace(/^[\s•·*\-–—]+/, '');
}

function clampYears(n: number): number | undefined {
  if (!Number.isFinite(n) || n < 0 || n > MAX_YEARS) return undefined;
  return n;
}
