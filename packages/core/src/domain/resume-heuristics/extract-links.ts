/**
 * URL classifier.
 *
 * The web adapter (`apps/web/lib/resume/heuristic-parser.ts`) calls
 * `unpdf.extractLinks` and passes the resulting URLs into
 * {@link parseResumeText}. Many CVs render contacts as plain anchor
 * text ("LinkedIn", "GitHub", "Telegram") with the actual URL stored
 * as a PDF Link annotation — the text path can't recover that. This
 * module classifies the annotation URLs by hostname and surfaces the
 * canonical contact URLs the text-only path missed.
 *
 * Bias: bad extraction is worse than no extraction. We only fill a
 * field when we're sure (LinkedIn requires `/in/<handle>` shape, etc.).
 */

export interface ContactLinks {
  readonly linkedinUrl?: string | undefined;
  readonly githubUrl?: string | undefined;
  readonly telegramUrl?: string | undefined;
  readonly twitterUrl?: string | undefined;
  /** First non-classified http(s) URL — likely personal site / portfolio. */
  readonly portfolioUrl?: string | undefined;
  /** mailto: payload, if present. */
  readonly email?: string | undefined;
  /** All non-contact URLs in order — useful for matching to experience entries. */
  readonly otherUrls: readonly string[];
}

const LINKEDIN_HOST = /(?:^|\.)linkedin\.com$/i;
const LINKEDIN_PROFILE_PATH = /^\/(?:in|pub)\/[^/]+\/?$/i;
const GITHUB_HOST = /(?:^|\.)github\.com$/i;
const GITHUB_PROFILE_PATH = /^\/[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/?$/;
const TELEGRAM_HOSTS = /(?:^|\.)(?:t\.me|telegram\.me|telegram\.org)$/i;
const TWITTER_HOSTS = /(?:^|\.)(?:twitter\.com|x\.com)$/i;

/**
 * Classify a list of URLs (as emitted by `unpdf.extractLinks`) into
 * named contact buckets. Only the FIRST match for each bucket wins —
 * CVs in the wild duplicate LinkedIn URLs (header + footer + cover
 * letter) and we want the first one (typically header).
 *
 * `mailto:` URLs become `email`. Everything that doesn't match a
 * known social host stays in `otherUrls` for downstream consumers.
 */
export function classifyLinks(urls: readonly string[]): ContactLinks {
  let linkedinUrl: string | undefined;
  let githubUrl: string | undefined;
  let telegramUrl: string | undefined;
  let twitterUrl: string | undefined;
  let portfolioUrl: string | undefined;
  let email: string | undefined;
  const otherUrls: string[] = [];
  const seen = new Set<string>();

  for (const raw of urls) {
    if (typeof raw !== 'string' || raw.length === 0) continue;
    const trimmed = raw.trim();
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);

    if (trimmed.toLowerCase().startsWith('mailto:')) {
      if (!email) email = trimmed.slice('mailto:'.length).split('?')[0]?.trim();
      continue;
    }

    let url: URL;
    try {
      url = new URL(trimmed);
    } catch {
      continue;
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') continue;

    const host = url.hostname.toLowerCase();
    const path = url.pathname.replace(/\/+$/, '/'); // collapse trailing slashes

    // First-match wins for primary contact buckets.
    if (!linkedinUrl && LINKEDIN_HOST.test(host) && LINKEDIN_PROFILE_PATH.test(path)) {
      linkedinUrl = canonical(url);
      continue;
    }
    if (!githubUrl && GITHUB_HOST.test(host) && GITHUB_PROFILE_PATH.test(path)) {
      githubUrl = canonical(url);
      continue;
    }
    if (!telegramUrl && TELEGRAM_HOSTS.test(host) && path.length > 1) {
      telegramUrl = canonical(url);
      continue;
    }
    if (!twitterUrl && TWITTER_HOSTS.test(host) && path.length > 1) {
      twitterUrl = canonical(url);
      continue;
    }
    // Drop *duplicate* personal-profile URLs (e.g. testimonials' LinkedIn
    // links) so they don't masquerade as portfolio / company URLs.
    // Non-profile-shape URLs on the same host (linkedin.com/company/X,
    // github.com/org/repo) ARE business URLs — keep them.
    const isDupSocialProfile =
      (LINKEDIN_HOST.test(host) && LINKEDIN_PROFILE_PATH.test(path)) ||
      (GITHUB_HOST.test(host) && GITHUB_PROFILE_PATH.test(path)) ||
      (TELEGRAM_HOSTS.test(host) && path.length > 1) ||
      (TWITTER_HOSTS.test(host) && path.length > 1);
    if (isDupSocialProfile) continue;
    otherUrls.push(canonical(url));
  }

  // Portfolio = first non-classified URL. Only set when the user has
  // *no* social presence captured — otherwise a company URL from the
  // experience section would slip in here ("first link in the list" is
  // unreliable on multi-role CVs). Skipped by default; the heuristic
  // is intentionally conservative.
  if (otherUrls.length === 1 && !linkedinUrl && !githubUrl) {
    portfolioUrl = otherUrls[0];
  }

  return {
    ...(linkedinUrl ? { linkedinUrl } : {}),
    ...(githubUrl ? { githubUrl } : {}),
    ...(telegramUrl ? { telegramUrl } : {}),
    ...(twitterUrl ? { twitterUrl } : {}),
    ...(portfolioUrl ? { portfolioUrl } : {}),
    ...(email ? { email } : {}),
    otherUrls,
  };
}

/** Strip query string + fragment, keep host + path. */
function canonical(url: URL): string {
  return `${url.protocol}//${url.host}${url.pathname.replace(/\/+$/, '')}`.replace(/\/$/, '');
}
