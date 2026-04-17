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
}

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;

/**
 * Phone: tolerates spaces, parens, hyphens, dots; 7..15 digits total.
 * Starts with either `+` or a digit; must have enough non-digit separators
 * to avoid matching random numeric sequences like order ids.
 */
const PHONE_RE = /\+?\d[\d\s().-]{6,20}\d/g;

const LINKEDIN_RE = /(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/in\/[A-Za-z0-9_-]+\/?/i;
const GITHUB_RE = /(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9_-]+\/?/i;
const GENERIC_URL_RE = /https?:\/\/[^\s)>\]]+/gi;

/** Max e164-like length per spec (15 digits without `+`). */
const MIN_PHONE_DIGITS = 7;
const MAX_PHONE_DIGITS = 15;

export function extractContacts(text: string): ContactInfo {
  const email = EMAIL_RE.exec(text)?.[0];
  const phone = extractPhone(text);
  const linkedinUrl = normalizeUrl(LINKEDIN_RE.exec(text)?.[0]);
  const githubUrl = normalizeUrl(GITHUB_RE.exec(text)?.[0]);
  const portfolioUrl = extractPortfolio(text, linkedinUrl, githubUrl);

  return stripUndefined({
    email,
    phone,
    linkedinUrl,
    githubUrl,
    portfolioUrl,
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
