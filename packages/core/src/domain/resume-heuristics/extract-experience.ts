/**
 * Experience extraction from the `experience` section body.
 *
 * MVP strategy — "find the dates, everything else is role/company":
 *   1. Split the section body by blank lines → entry chunks.
 *   2. For each chunk, find a date range (YYYY-MM or YYYY; "present"-aware
 *      in 5 locales for the end date).
 *   3. Strip the dates out of the header line; split the remainder on
 *      " — " / " - " / " at " / " в " / " у ". Assume the longer fragment
 *      is the company, the shorter one is the role (heuristic that holds
 *      on most CVs — ambiguous cases leave the user to swap the two in
 *      the review step).
 *   4. The rest of the entry (lines after the header) becomes `description`.
 *
 * Entries without any date are dropped — they're almost certainly not a
 * work row.
 */

import type { ExperienceEntry } from '../profile';

const MAX_ENTRIES = 20;
const MAX_DESCRIPTION = 400;
const MONTH_NAMES: Readonly<Record<string, number>> = {
  jan: 1,
  january: 1,
  janv: 1,
  gen: 1,
  gennaio: 1,
  sty: 1,
  styczeń: 1,
  янв: 1,
  январь: 1,
  січ: 1,
  січень: 1,
  feb: 2,
  february: 2,
  févr: 2,
  fev: 2,
  febbraio: 2,
  lut: 2,
  luty: 2,
  фев: 2,
  февраль: 2,
  лют: 2,
  лютий: 2,
  mar: 3,
  march: 3,
  mars: 3,
  mar_it: 3,
  marzo: 3,
  mar_pl: 3,
  marzec: 3,
  мар: 3,
  март: 3,
  бер: 3,
  березень: 3,
  apr: 4,
  april: 4,
  avr: 4,
  apr_it: 4,
  aprile: 4,
  kwi: 4,
  kwiecień: 4,
  апр: 4,
  апрель: 4,
  кві: 4,
  квітень: 4,
  may: 5,
  maj: 5,
  maggio: 5,
  май: 5,
  травень: 5,
  трав: 5,
  jun: 6,
  june: 6,
  juin: 6,
  giu: 6,
  giugno: 6,
  cze: 6,
  czerwiec: 6,
  июн: 6,
  июнь: 6,
  чер: 6,
  червень: 6,
  jul: 7,
  july: 7,
  juil: 7,
  lug: 7,
  luglio: 7,
  lip: 7,
  lipiec: 7,
  июл: 7,
  июль: 7,
  лип: 7,
  липень: 7,
  aug: 8,
  august: 8,
  aoû: 8,
  ago: 8,
  agosto: 8,
  sie: 8,
  sierpień: 8,
  авг: 8,
  август: 8,
  сер: 8,
  серпень: 8,
  sep: 9,
  sept: 9,
  september: 9,
  set: 9,
  settembre: 9,
  wrz: 9,
  wrzesień: 9,
  сен: 9,
  сентябрь: 9,
  вер: 9,
  вересень: 9,
  oct: 10,
  october: 10,
  ott: 10,
  ottobre: 10,
  paź: 10,
  październik: 10,
  окт: 10,
  октябрь: 10,
  жов: 10,
  жовтень: 10,
  nov: 11,
  november: 11,
  nov_it: 11,
  novembre: 11,
  lis: 11,
  listopad: 11,
  ноя: 11,
  ноябрь: 11,
  лис: 11,
  листопад: 11,
  dec: 12,
  december: 12,
  déc: 12,
  dic: 12,
  dicembre: 12,
  gru: 12,
  grudzień: 12,
  дек: 12,
  декабрь: 12,
  гру: 12,
  грудень: 12,
};

const PRESENT_RE =
  /(?<!\p{L})(present|now|current|нині|зараз|настоящее|attuale|obecnie|oggi|teraz)(?!\p{L})/iu;

/** Horizontal whitespace only — never crosses newlines. */
const HS = '[ \\t]*';
/** "YYYY" or "YYYY-MM" / "YYYY/MM" / "YYYY.MM". */
const ISO_DATE = '(?:\\d{4}(?:[-/.]\\d{1,2})?)';
/** "Jan 2024" / "January 2024" / "Січ 2024" — letters + hspace + year. */
const MONTH_YEAR = '(?:[A-Za-zА-Яа-яІіЇїЄєҐґ]+\\.?[ \\t]+\\d{4})';
const PRESENT_TOKEN = '(?:present|now|current|нині|зараз|настоящее|attuale|obecnie|oggi|teraz)';
const DATE_ALT = `(?:${ISO_DATE}|${MONTH_YEAR})`;

const DATE_RANGE_RE = new RegExp(
  `(${DATE_ALT})${HS}[—–-]${HS}(${DATE_ALT}|${PRESENT_TOKEN})`,
  'iu',
);
const SINGLE_YEAR_RE = /\b(\d{4})\b/;

const COMPANY_ROLE_SEPS = /\s*[—–]\s*|\s+at\s+|\s+в\s+|\s+у\s+|\s+@\s+|\s+,\s+/u;

interface DateRange {
  readonly start: string;
  readonly end: string | null;
  readonly rawMatch: string;
}

export function extractExperience(experienceBody: string): readonly ExperienceEntry[] {
  const body = experienceBody.trim();
  if (body.length === 0) return [];
  const chunks = splitEntries(body);
  const out: ExperienceEntry[] = [];
  for (const chunk of chunks) {
    const parsed = parseExperienceEntry(chunk);
    if (parsed) out.push(parsed);
    if (out.length >= MAX_ENTRIES) break;
  }
  return out;
}

function splitEntries(body: string): string[] {
  return body
    .split(/\n\s*\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseExperienceEntry(chunk: string): ExperienceEntry | null {
  const dates = findDateRange(chunk);
  if (!dates) return null;

  const lines = chunk
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const firstLine = lines[0] ?? '';
  const headerWithoutDates = firstLine
    .replace(dates.rawMatch, '')
    .replace(/^[\s—–\-|,()]+|[\s—–\-|,()]+$/g, '')
    .trim();

  const { company, role } = splitCompanyRole(headerWithoutDates);
  if (!company || !role) return null;

  const descriptionLines = lines.slice(1);
  const description = descriptionLines.length
    ? truncate(descriptionLines.join(' '), MAX_DESCRIPTION)
    : undefined;

  return {
    company,
    role,
    startMonth: dates.start,
    endMonth: dates.end,
    ...(description !== undefined ? { description } : {}),
  };
}

function findDateRange(chunk: string): DateRange | null {
  // Scan per-line to keep the match from bleeding across newlines.
  for (const line of chunk.split('\n')) {
    const rangeMatch = DATE_RANGE_RE.exec(line);
    if (rangeMatch) {
      const [raw, startRaw, endRaw] = rangeMatch;
      const start = normalizeDate(startRaw ?? '');
      if (!start) continue;
      const end = resolveEnd(endRaw ?? '');
      return { start, end, rawMatch: raw };
    }
  }
  const single = SINGLE_YEAR_RE.exec(chunk);
  if (single?.[1]) {
    const year = single[1];
    return { start: `${year}-01`, end: null, rawMatch: single[0] };
  }
  return null;
}

function resolveEnd(endRaw: string): string | null {
  if (PRESENT_RE.test(endRaw)) return null;
  return normalizeDate(endRaw) ?? null;
}

function normalizeDate(raw: string): string | null {
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  if (!trimmed) return null;
  // Year-only "2024"
  const yearOnly = /^(\d{4})$/.exec(trimmed);
  if (yearOnly?.[1]) return `${yearOnly[1]}-01`;
  // ISO "YYYY-MM" or "YYYY/MM" or "YYYY.MM"
  const iso = /^(\d{4})[-/.](\d{1,2})$/.exec(trimmed);
  if (iso?.[1] && iso[2]) {
    const month = Math.min(Math.max(Number.parseInt(iso[2], 10), 1), 12);
    return `${iso[1]}-${pad2(month)}`;
  }
  // "Jan 2024" / "January 2024" / "Січ 2024" etc.
  const monthYear = /^([A-Za-zА-Яа-яІіЇїЄєҐґ.]+)\s+(\d{4})$/u.exec(trimmed);
  if (monthYear?.[1] && monthYear[2]) {
    const monthKey = monthYear[1].toLowerCase().replace(/\.$/, '');
    const month = lookupMonth(monthKey);
    if (month) return `${monthYear[2]}-${pad2(month)}`;
    return `${monthYear[2]}-01`;
  }
  return null;
}

function lookupMonth(key: string): number | undefined {
  if (MONTH_NAMES[key] !== undefined) return MONTH_NAMES[key];
  for (const [k, v] of Object.entries(MONTH_NAMES)) {
    const bare = k.replace(/_.*$/, '');
    if (bare === key) return v;
  }
  return undefined;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function splitCompanyRole(line: string): { company?: string; role?: string } {
  if (!line) return {};
  const parts = line
    .split(COMPANY_ROLE_SEPS)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 2) return {};

  const first = parts[0] ?? '';
  const second = parts[1] ?? '';
  // Heuristic: the fragment containing words like "Developer / Engineer / Designer /
  // Manager" is the role; the other is company.
  if (looksLikeRole(first) && !looksLikeRole(second)) {
    return { role: first, company: second };
  }
  if (looksLikeRole(second) && !looksLikeRole(first)) {
    return { company: first, role: second };
  }
  // Fallback: assume "Company — Role"
  return { company: first, role: second };
}

const ROLE_KEYWORDS =
  /\b(developer|engineer|designer|manager|analyst|consultant|architect|director|owner|specialist|lead|head|officer|founder|marketer|scientist|researcher|розроб|інженер|менеджер|дизайн|аналіт|консультант|архітект|керівник|власник|засновник|разработ|аналит|консультант|руководит|sviluppatore|progettista|consulente|analista|direttore|programista|kierownik|projektant|doradca|specjalista)\b/iu;

function looksLikeRole(fragment: string): boolean {
  return ROLE_KEYWORDS.test(fragment);
}

function truncate(s: string, max: number): string {
  const clean = s.replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`;
}
