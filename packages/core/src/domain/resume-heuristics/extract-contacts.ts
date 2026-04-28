/**
 * Regex-based contact extraction from the full CV text.
 *
 * Every field is optional — bad extraction is better than a wrong guess, so
 * any ambiguous case falls back to `undefined` and the user fills it in.
 */

export interface ContactInfo {
  readonly email?: string | undefined;
  readonly phone?: string | undefined;
  readonly linkedinUrl?: string | undefined;
  readonly githubUrl?: string | undefined;
  readonly portfolioUrl?: string | undefined;
  readonly location?: string | undefined;
}

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;

/**
 * Phone: tolerates spaces, parens, hyphens, dots; 7..15 digits total.
 * Starts with either `+` or a digit; must have enough non-digit separators
 * to avoid matching random numeric sequences like order ids.
 */
const PHONE_RE = /\+?\d[\d\s().-]{6,20}\d/g;

/**
 * LinkedIn URLs come in many shapes:
 *   - linkedin.com/in/handle
 *   - www.linkedin.com/handle (livecareer-style truncation)
 *   - https://uk.linkedin.com/in/handle
 *   - linkedin.com/pub/handle
 * We accept anything after `linkedin.com/`.
 */
const LINKEDIN_RE = /(?:https?:\/\/)?(?:www\.)?(?:[a-z]{2,3}\.)?linkedin\.com\/[A-Za-z0-9_/-]+\/?/i;
/** GitHub: github.com/{handle}, optionally with /repo. */
const GITHUB_RE = /(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_.-]+)?\/?/i;
const GENERIC_URL_RE = /https?:\/\/[^\s)>\]]+/gi;

/** Max e164-like length per spec (15 digits without `+`). */
const MIN_PHONE_DIGITS = 7;
const MAX_PHONE_DIGITS = 15;

/**
 * US-style location patterns (City, ST [ZIP]) and international "City, Country"
 * patterns we accept inline.
 */
const US_STATE_CODES = new Set([
  'AL',
  'AK',
  'AZ',
  'AR',
  'CA',
  'CO',
  'CT',
  'DE',
  'FL',
  'GA',
  'HI',
  'ID',
  'IL',
  'IN',
  'IA',
  'KS',
  'KY',
  'LA',
  'ME',
  'MD',
  'MA',
  'MI',
  'MN',
  'MS',
  'MO',
  'MT',
  'NE',
  'NV',
  'NH',
  'NJ',
  'NM',
  'NY',
  'NC',
  'ND',
  'OH',
  'OK',
  'OR',
  'PA',
  'RI',
  'SC',
  'SD',
  'TN',
  'TX',
  'UT',
  'VT',
  'VA',
  'WA',
  'WV',
  'WI',
  'WY',
  'DC',
]);

/** Map from full state name (lowercase) → two-letter code. */
const US_STATE_NAMES: ReadonlyMap<string, string> = new Map([
  ['alabama', 'AL'],
  ['alaska', 'AK'],
  ['arizona', 'AZ'],
  ['arkansas', 'AR'],
  ['california', 'CA'],
  ['colorado', 'CO'],
  ['connecticut', 'CT'],
  ['delaware', 'DE'],
  ['florida', 'FL'],
  ['georgia', 'GA'],
  ['hawaii', 'HI'],
  ['idaho', 'ID'],
  ['illinois', 'IL'],
  ['indiana', 'IN'],
  ['iowa', 'IA'],
  ['kansas', 'KS'],
  ['kentucky', 'KY'],
  ['louisiana', 'LA'],
  ['maine', 'ME'],
  ['maryland', 'MD'],
  ['massachusetts', 'MA'],
  ['michigan', 'MI'],
  ['minnesota', 'MN'],
  ['mississippi', 'MS'],
  ['missouri', 'MO'],
  ['montana', 'MT'],
  ['nebraska', 'NE'],
  ['nevada', 'NV'],
  ['new hampshire', 'NH'],
  ['new jersey', 'NJ'],
  ['new mexico', 'NM'],
  ['new york', 'NY'],
  ['north carolina', 'NC'],
  ['north dakota', 'ND'],
  ['ohio', 'OH'],
  ['oklahoma', 'OK'],
  ['oregon', 'OR'],
  ['pennsylvania', 'PA'],
  ['rhode island', 'RI'],
  ['south carolina', 'SC'],
  ['south dakota', 'SD'],
  ['tennessee', 'TN'],
  ['texas', 'TX'],
  ['utah', 'UT'],
  ['vermont', 'VT'],
  ['virginia', 'VA'],
  ['washington', 'WA'],
  ['west virginia', 'WV'],
  ['wisconsin', 'WI'],
  ['wyoming', 'WY'],
  ['district of columbia', 'DC'],
]);

/**
 * "City, ST" or "City, ST 12345". Use a lazy capture so we don't gobble the
 * preceding contact line.
 */
const US_LOCATION_RE = /([A-Z][A-Za-z .'-]{1,30}?),\s+([A-Z]{2})(?:\s+(\d{5}(?:-\d{4})?))?\b/g;
/** "City, FullStateName" — needs case-insensitive match against state-name dict. */
const US_FULL_STATE_RE =
  /([A-Z][A-Za-z .'-]{1,30}?),\s+([A-Z][a-zA-Z ]{3,30})(?:\s+(\d{5}(?:-\d{4})?))?(?:\s*,\s*(?:US|USA|United States))?\b/g;

/**
 * Common non-US country names — covers most international resumes from our
 * sample dataset and OECD countries. Keep lowercase for case-insensitive lookup.
 */
const COUNTRIES = new Set([
  'usa',
  'united states',
  'uk',
  'united kingdom',
  'great britain',
  'england',
  'scotland',
  'wales',
  'ireland',
  'canada',
  'australia',
  'new zealand',
  'germany',
  'france',
  'italy',
  'spain',
  'portugal',
  'netherlands',
  'belgium',
  'switzerland',
  'austria',
  'sweden',
  'norway',
  'denmark',
  'finland',
  'iceland',
  'poland',
  'czech republic',
  'slovakia',
  'hungary',
  'romania',
  'bulgaria',
  'greece',
  'croatia',
  'serbia',
  'ukraine',
  'belarus',
  'russia',
  'lithuania',
  'latvia',
  'estonia',
  'luxembourg',
  'japan',
  'china',
  'south korea',
  'korea',
  'singapore',
  'hong kong',
  'taiwan',
  'india',
  'pakistan',
  'bangladesh',
  'sri lanka',
  'philippines',
  'indonesia',
  'malaysia',
  'thailand',
  'vietnam',
  'brazil',
  'argentina',
  'chile',
  'mexico',
  'colombia',
  'peru',
  'uruguay',
  'south africa',
  'egypt',
  'nigeria',
  'kenya',
  'morocco',
  'tunisia',
  'uae',
  'saudi arabia',
  'israel',
  'turkey',
  'qatar',
]);

const INTL_LOCATION_RE =
  /([A-Z][A-Za-zà-žÀ-Žа-яА-ЯіїєґІЇЄҐ .'-]{1,40}?),\s+([A-Z][A-Za-zà-žÀ-Žа-яА-ЯіїєґІЇЄҐ .'-]{2,40})/g;

export function extractContacts(text: string): ContactInfo {
  const email = EMAIL_RE.exec(text)?.[0];
  const phone = extractPhone(text);
  const linkedinUrl = normalizeUrl(LINKEDIN_RE.exec(text)?.[0]);
  const githubUrl = normalizeUrl(GITHUB_RE.exec(text)?.[0]);
  const portfolioUrl = extractPortfolio(text, linkedinUrl, githubUrl);
  const location = extractLocation(text);

  return stripUndefined({
    email,
    phone,
    linkedinUrl,
    githubUrl,
    portfolioUrl,
    location,
  });
}

function extractPhone(text: string): string | undefined {
  const matches = text.match(PHONE_RE);
  if (!matches) return undefined;
  for (const raw of matches) {
    const candidate = raw.trim();
    const digits = candidate.replace(/\D/g, '');
    if (digits.length < MIN_PHONE_DIGITS || digits.length > MAX_PHONE_DIGITS) continue;
    // Reject candidates that look like ISO-ish dates or plain year ranges:
    // a 4-digit run followed by a hyphen and another 4-digit run dominates.
    if (/^\d{4}-\d{4}$/.test(candidate)) continue;
    return candidate;
  }
  return undefined;
}

function extractPortfolio(
  text: string,
  linkedinUrl: string | undefined,
  githubUrl: string | undefined,
): string | undefined {
  const urls = text.match(GENERIC_URL_RE) ?? [];
  for (const raw of urls) {
    const clean = trimTrailingPunct(raw);
    const lower = clean.toLowerCase();
    if (linkedinUrl && lower.includes('linkedin.com')) continue;
    if (githubUrl && lower.includes('github.com')) continue;
    if (lower.includes('mailto:')) continue;
    return clean;
  }
  return undefined;
}

/**
 * Search the first ~2000 chars of the resume — contact info is virtually
 * always near the top. Prefer "City, ST 12345" (US), then "City, ST", then
 * "City, Country".
 */
function extractLocation(text: string): string | undefined {
  const head = text.slice(0, 2000);

  // 1. US "City, ST [ZIP]" — most common in this dataset
  const seenUs: string[] = [];
  let m: RegExpExecArray | null;
  US_LOCATION_RE.lastIndex = 0;
  while ((m = US_LOCATION_RE.exec(head)) !== null) {
    const [, city, state, zip] = m;
    if (city && state && US_STATE_CODES.has(state)) {
      seenUs.push(zip ? `${city}, ${state} ${zip}` : `${city}, ${state}`);
    }
  }
  if (seenUs.length > 0) return seenUs[0];

  // 2. US "City, FullStateName" → normalize to "City, ST"
  US_FULL_STATE_RE.lastIndex = 0;
  while ((m = US_FULL_STATE_RE.exec(head)) !== null) {
    const [, city, state] = m;
    if (!city || !state) continue;
    const code = US_STATE_NAMES.get(state.toLowerCase().trim());
    if (code) return `${city.trim()}, ${code}`;
  }

  // 3. International "City, Country"
  INTL_LOCATION_RE.lastIndex = 0;
  while ((m = INTL_LOCATION_RE.exec(head)) !== null) {
    const [, city, country] = m;
    if (!city || !country) continue;
    const ck = country.toLowerCase().trim();
    if (COUNTRIES.has(ck)) return `${city.trim()}, ${country.trim()}`;
  }

  return undefined;
}

function normalizeUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = trimTrailingPunct(raw).replace(/\/$/, '');
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function trimTrailingPunct(raw: string): string {
  return raw.replace(/[.,;:!?)\]>]+$/, '');
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as T;
}
