/**
 * Experience extraction from the `experience` section body.
 *
 * Real-world resume formats are highly varied. We support these date forms:
 *   - `2020 - 2024`, `2020-2024`
 *   - `Jan 2020 - Mar 2024`, `January 2020 - Present`
 *   - `01/2020 - 03/2024`, `01/2020-Current`
 *   - `Apr '18 - Apr '20` (LiveCareer-style)
 *
 * Entry-splitting strategy: a line that contains a date range is an "entry
 * header"; everything between two header lines belongs to the previous entry.
 * Bullets (•, *, -) are description; non-bullet lines next to the header
 * are company/location.
 *
 * Two common header layouts we handle:
 *   A.  Role, MM/YYYY - Current
 *       Company - City, ST
 *       • bullets
 *
 *   B.  Role | Company | MM/YYYY - Current
 *       • bullets
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
  marzo: 3,
  marzec: 3,
  мар: 3,
  март: 3,
  бер: 3,
  березень: 3,
  apr: 4,
  april: 4,
  avr: 4,
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
  novembre: 11,
  lis: 11,
  listopad: 11,
  ноя: 11,
  ноябрь: 11,
  лис: 11,
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

const PRESENT_TOKEN = '(?:present|now|current|нині|зараз|настоящее|attuale|obecnie|oggi|teraz)';

/** A single date token. Order matters — most specific first. */
const DATE_TOKEN =
  '(?:' +
  // MM/YYYY or MM-YYYY or MM.YYYY
  '\\d{1,2}[\\/.\\-]\\d{4}' +
  '|' +
  // YYYY-MM, YYYY/MM, YYYY.MM
  '\\d{4}[-/.]\\d{1,2}' +
  '|' +
  // Mon 'YY  e.g. Apr '18
  "[A-Za-zА-Яа-яІіЇїЄєҐґ]+\\.?[ \\t]+'\\d{2}" +
  '|' +
  // Mon YYYY  e.g. April 2024 / Січ 2024
  '[A-Za-zА-Яа-яІіЇїЄєҐґ]+\\.?[ \\t]+\\d{4}' +
  '|' +
  // Bare YYYY
  '\\d{4}' +
  ')';

const DATE_RANGE_RE = new RegExp(
  `(${DATE_TOKEN})[ \\t]*[—–\\-to]+[ \\t]*(${DATE_TOKEN}|${PRESENT_TOKEN})`,
  'iu',
);
/** Two date tokens separated by whitespace only (e.g. "Apr '18 Apr '20", "02/2014 02/2019"). */
const DATE_RANGE_SPACE_RE = new RegExp(
  `(${DATE_TOKEN})[ \\t]+(${DATE_TOKEN}|${PRESENT_TOKEN})(?!\\d)`,
  'iu',
);
const SINGLE_YEAR_RE = /\b(\d{4})\b/;

/**
 * "Header line" detector — a line is treated as the start of an experience
 * entry if it contains a date range or a single MM/YYYY anchor.
 */
const HEADER_LINE_RE = new RegExp(
  `(?:${DATE_TOKEN}[ \\t]*[—–\\-to]+[ \\t]*(?:${DATE_TOKEN}|${PRESENT_TOKEN}))|(?:\\d{1,2}[\\/.\\-]\\d{4})|(?:[A-Za-zА-Яа-яІіЇїЄєҐґ]+\\.?[ \\t]+'\\d{2})`,
  'iu',
);

/**
 * Recognised separators between company and role on the header line.
 * The hyphen variant requires surrounding whitespace to avoid splitting
 * compound words like "Mid-Illinois".
 */
const COMPANY_ROLE_SEPS = /\s*\|\s*|\s+[—–]\s+|\s+-\s+|\s+at\s+|\s+в\s+|\s+у\s+|\s+@\s+/u;

const BULLET_RE = /^[\s]*[•·*‣◦▪►▶➤]/;

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

/**
 * Date-anchored splitter: a line that contains a date pattern starts a new entry.
 * Lines before the first date-line are dropped (preamble).
 *
 * Falls back to the legacy blank-line split if no date anchors are found —
 * preserves correctness for synthetic CVs the unit tests cover.
 */
function splitEntries(body: string): string[] {
  // unpdf joins multi-page PDFs with `\n\n`, which can land inside the
  // experience section. Naive blank-line splitting would treat each
  // page-fragment as a single entry even when it contains two role
  // headers. We therefore *always* run the date-anchored splitter on the
  // joined body, falling back to blank-split only when no date anchors
  // are present (synthetic CVs the unit tests cover).
  const blankSplit = body
    .split(/\n\s*\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const lines = body.split('\n').map((l) => l.trim());

  const headerIndices: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line && HEADER_LINE_RE.test(line)) headerIndices.push(i);
  }

  if (headerIndices.length === 0) {
    return blankSplit;
  }
  // Single header + clean blank-split that already separates entries: the
  // legacy fast path. Keeps the existing test fixtures green.
  if (
    headerIndices.length === 1 &&
    blankSplit.length >= 2 &&
    blankSplit.every((c) => HEADER_LINE_RE.test(c))
  ) {
    return blankSplit;
  }

  // For each date-line, walk backward and absorb up to 2 short non-bullet,
  // non-description, non-date lines that look like a role/company header.
  // Layout we're catching: "Harvey | Software Engineer (contract)" sits one
  // line above "Aug 2024 – Apr 2025 (9 months)" and was previously
  // misattributed to the *previous* entry's tail.
  const entryStarts: number[] = headerIndices.map((dateIdx, i) => {
    if (i === 0) return 0;
    const prevDate = headerIndices[i - 1] as number;
    let s = dateIdx;
    let absorbed = 0;
    while (s - 1 > prevDate && absorbed < 2) {
      const cand = lines[s - 1];
      if (cand === undefined) break;
      if (cand.length === 0) {
        s--; // skip blank lines, don't count toward the budget
        continue;
      }
      if (BULLET_RE.test(cand)) break;
      if (looksLikeDate(cand)) break;
      if (cand.length > 120) break;
      // Header lines tend to be sentence-fragments without trailing periods.
      // If the candidate looks unmistakably like description prose, stop.
      if (looksLikeDescription(cand)) break;
      s--;
      absorbed++;
    }
    return s;
  });

  const chunks: string[] = [];
  for (let i = 0; i < entryStarts.length; i++) {
    const start = entryStarts[i] as number;
    const end = (entryStarts[i + 1] ?? lines.length) as number;
    const chunk = lines
      .slice(start, end)
      .filter((l) => l.length > 0)
      .join('\n');
    if (chunk) chunks.push(chunk);
  }
  return chunks;
}

function parseExperienceEntry(chunk: string): ExperienceEntry | null {
  const dates = findDateRange(chunk);
  if (!dates) return null;

  const allLines = chunk
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  // Find the first bullet — if present, that's the cleanest header/desc split.
  let bulletStart = allLines.length;
  for (let i = 0; i < allLines.length; i++) {
    if (BULLET_RE.test(allLines[i] as string)) {
      bulletStart = i;
      break;
    }
  }

  // For chunks without bullets, fall back to a sentence-style heuristic: a line
  // that starts with an action verb, is unusually long, or contains
  // sentence-ending punctuation looks like a description, not a header.
  let descCutoff = bulletStart;
  if (descCutoff === allLines.length) {
    for (let i = 0; i < allLines.length; i++) {
      if (looksLikeDescription(allLines[i] as string)) {
        descCutoff = i;
        break;
      }
    }
  }

  const headerLines = allLines.slice(0, descCutoff);
  const descLines = allLines.slice(descCutoff);

  // Date may live on a header line, or sometimes after the bullets in some
  // formats. We treat header info as everything in headerLines that isn't
  // itself a date-only line.
  const nonDateHeaderLines = headerLines.filter((l) => !looksLikeDate(l) && !DATE_RANGE_RE.test(l));
  const dateLineIdx = headerLines.findIndex((l) => l.includes(dates.rawMatch));
  const dateLine = (dateLineIdx >= 0 ? headerLines[dateLineIdx] : '') as string;
  const dateLineRest = dateLine
    .replace(dates.rawMatch, '')
    .replace(/^[\s,—–\-|()]+|[\s,—–\-|()]+$/g, '')
    .trim();

  // 1. Try splitting the date line itself: "Role | Company | dates" or "Role at Company"
  let { company, role } = dateLineRest
    ? splitCompanyRole(dateLineRest)
    : ({} as { company?: string; role?: string });

  // 2. If still missing, parse non-date header lines.
  //    Pass A: prefer any line that splits cleanly by `|`, ` — `, ` at `,
  //    etc. Real "Company | Role" lines always win over an orphaned
  //    sentence ("feature delivery." sliding in from the previous entry's
  //    tail). We grab the first such match and skip the legacy
  //    first-line-wins fallback below.
  if (!company || !role) {
    for (const other of nonDateHeaderLines) {
      if (other === dateLine) continue;
      const split = splitCompanyRole(other);
      if (split.company && split.role) {
        if (!company) company = split.company;
        if (!role) role = split.role;
        if (company && role) break;
      }
    }
  }
  // Pass B: legacy "Company - Location" dash-prefix and single-fragment
  // fallback for layouts without a separator. Only runs if Pass A came
  // up empty.
  if (!company || !role) {
    for (const other of nonDateHeaderLines) {
      if (other === dateLine) continue;
      const m = /^(.+?)\s+[—–\-]\s+/.exec(other);
      const candidate = m?.[1]?.trim() ?? other.trim();
      if (!company) {
        company = candidate;
        if (!role && dateLineRest && !looksLikeDate(dateLineRest)) {
          role = stripTrailingPunct(dateLineRest);
        }
      } else if (!role) {
        role = candidate;
      }
      if (company && role) break;
    }
  }

  // 3. Two-line header: company on one line, role on the other.
  if ((!company || !role) && nonDateHeaderLines.length >= 2) {
    const line1 = (nonDateHeaderLines[0] ?? '') as string;
    const line2 = (nonDateHeaderLines[1] ?? '') as string;
    if (looksLikeRole(line1) && !looksLikeRole(line2)) {
      role = role ?? line1;
      company = company ?? line2;
    } else if (looksLikeRole(line2) && !looksLikeRole(line1)) {
      role = role ?? line2;
      company = company ?? line1;
    } else {
      // Fallback: assume company first, role second
      company = company ?? line1;
      role = role ?? line2;
    }
  }

  // 4. Single non-date line — call it role, company stays unknown.
  if (!role && nonDateHeaderLines.length === 1) {
    role = nonDateHeaderLines[0] as string;
  }
  // 5. Last resort: date line had a single fragment, that's the role.
  if (!role && dateLineRest && !looksLikeDate(dateLineRest)) {
    role = stripTrailingPunct(dateLineRest);
  }

  if (!company || !role) return null;
  // Reject obvious garbage
  if (role.length > 80 || company.length > 100) return null;

  const description = descLines.length ? truncate(descLines.join(' '), MAX_DESCRIPTION) : undefined;

  return {
    company,
    role,
    startMonth: dates.start,
    endMonth: dates.end,
    ...(description !== undefined ? { description } : {}),
  };
}

function findDateRange(chunk: string): DateRange | null {
  for (const line of chunk.split('\n')) {
    // 1. Standard "DATE - DATE / Present"
    const rangeMatch = DATE_RANGE_RE.exec(line);
    if (rangeMatch) {
      const [raw, startRaw, endRaw] = rangeMatch;
      const start = normalizeDate(startRaw ?? '');
      if (!start) continue;
      const end = resolveEnd(endRaw ?? '');
      return { start, end, rawMatch: raw };
    }
    // 2. Whitespace-separated "Apr '18 Apr '20" or "02/2014 02/2019"
    const spaceMatch = DATE_RANGE_SPACE_RE.exec(line);
    if (spaceMatch) {
      const [raw, startRaw, endRaw] = spaceMatch;
      const start = normalizeDate(startRaw ?? '');
      if (!start) continue;
      const end = resolveEnd(endRaw ?? '');
      // Sanity: end >= start (otherwise it's two unrelated dates)
      if (end && end < start) continue;
      return { start, end, rawMatch: raw };
    }
    // 3. Single MM/YYYY anchor
    const single = /\b(\d{1,2})[\/.\-](\d{4})\b/.exec(line);
    if (single?.[1] && single[2]) {
      const month = clampMonth(Number.parseInt(single[1], 10));
      return {
        start: `${single[2]}-${pad2(month)}`,
        end: null,
        rawMatch: single[0],
      };
    }
  }
  // 4. Single Mon 'YY anywhere in the chunk
  const monApos = /[A-Za-z]+\.?\s+'\d{2}/.exec(chunk);
  if (monApos?.[0]) {
    const norm = normalizeDate(monApos[0]);
    if (norm) return { start: norm, end: null, rawMatch: monApos[0] };
  }
  // 5. Single 4-digit year as last resort
  const single = SINGLE_YEAR_RE.exec(chunk);
  if (single?.[1]) {
    return { start: `${single[1]}-01`, end: null, rawMatch: single[0] };
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

  // YYYY only
  const yearOnly = /^(\d{4})$/.exec(trimmed);
  if (yearOnly?.[1]) return `${yearOnly[1]}-01`;

  // YYYY[-/.]MM
  const isoYM = /^(\d{4})[-/.](\d{1,2})$/.exec(trimmed);
  if (isoYM?.[1] && isoYM[2]) {
    const month = clampMonth(Number.parseInt(isoYM[2], 10));
    return `${isoYM[1]}-${pad2(month)}`;
  }

  // MM[/.\-]YYYY  (e.g. 01/2013, 03-2009)
  const mmYy = /^(\d{1,2})[\/.\-](\d{4})$/.exec(trimmed);
  if (mmYy?.[1] && mmYy[2]) {
    const month = clampMonth(Number.parseInt(mmYy[1], 10));
    return `${mmYy[2]}-${pad2(month)}`;
  }

  // Mon 'YY  (e.g. Apr '18)
  const monAposYy = /^([A-Za-zА-Яа-яІіЇїЄєҐґ.]+)\s+'(\d{2})$/u.exec(trimmed);
  if (monAposYy?.[1] && monAposYy[2]) {
    const month = lookupMonth(monAposYy[1].toLowerCase().replace(/\.$/, ''));
    const yy = Number.parseInt(monAposYy[2], 10);
    const year = yy < 50 ? 2000 + yy : 1900 + yy;
    if (month) return `${year}-${pad2(month)}`;
    return `${year}-01`;
  }

  // Mon YYYY  (e.g. April 2024)
  const monYy = /^([A-Za-zА-Яа-яІіЇїЄєҐґ.]+)\s+(\d{4})$/u.exec(trimmed);
  if (monYy?.[1] && monYy[2]) {
    const month = lookupMonth(monYy[1].toLowerCase().replace(/\.$/, ''));
    if (month) return `${monYy[2]}-${pad2(month)}`;
    return `${monYy[2]}-01`;
  }

  return null;
}

function lookupMonth(key: string): number | undefined {
  return MONTH_NAMES[key];
}

function clampMonth(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(Math.max(n, 1), 12);
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function looksLikeDate(s: string): boolean {
  return DATE_RANGE_RE.test(s) || /^\d{4}$/.test(s) || /^\d{1,2}[\/.\-]\d{4}$/.test(s);
}

const DESCRIPTION_VERB_RE =
  /^(developed?|designed?|implemented|created?|managed?|led|worked|built|achieved|maintained|improved|delivered|coordinated|conducted|established|provided|prepared|reviewed|analy[sz]ed|migrated?|integrated|architected|launched|owned|spearheaded|drove|grew|reduced|increased|optimi[sz]ed|automated|deployed|wrote|presented|trained|mentored|supervised|oversaw|streamlined|negotiated|collaborated|championed|engineered|developed)\b/i;

function looksLikeDescription(line: string): boolean {
  if (BULLET_RE.test(line)) return true;
  if (line.length > 80) return true;
  if (DESCRIPTION_VERB_RE.test(line)) return true;
  // Multiple sentences or a sentence-ending period followed by space.
  if (/[.!?]\s/.test(line)) return true;
  return false;
}

function stripTrailingPunct(s: string): string {
  return s.replace(/^[\s,—–\-|()]+|[\s,—–\-|()]+$/g, '').trim();
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
  // Heuristic: the fragment containing role keywords wins.
  if (looksLikeRole(first) && !looksLikeRole(second)) {
    return { role: first, company: second };
  }
  if (looksLikeRole(second) && !looksLikeRole(first)) {
    return { company: first, role: second };
  }
  return { company: first, role: second };
}

const ROLE_KEYWORDS =
  /\b(developer|engineer|designer|manager|analyst|consultant|architect|director|owner|specialist|lead|head|officer|founder|marketer|scientist|researcher|accountant|advisor|admin|administrator|coordinator|associate|assistant|представник|product|programmer|technician|operator|nurse|teacher|professor|sales|representative|executive|intern|trainee|chief|vp|cto|ceo|coo|cfo|розроб|інженер|менеджер|дизайн|аналіт|консультант|архітект|керівник|власник|засновник|разработ|аналит|консультант|руководит|sviluppatore|progettista|consulente|analista|direttore|programista|kierownik|projektant|doradca|specjalista)\b/iu;

function looksLikeRole(fragment: string): boolean {
  return ROLE_KEYWORDS.test(fragment);
}

function truncate(s: string, max: number): string {
  const clean = s.replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`;
}
