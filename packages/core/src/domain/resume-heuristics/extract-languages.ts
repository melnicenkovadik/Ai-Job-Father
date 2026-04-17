/**
 * Languages extraction from the `languages` section body.
 *
 * Recognises:
 *   - common language names (EN / UK / RU / IT / PL / DE / FR / ES), with
 *     native-script variants ("Ukrainian", "українська", "итальянский"…);
 *   - CEFR level tokens (A1..C2, case-insensitive);
 *   - native-speaker markers in 5 locales → normalised to "C2".
 *
 * Anything we can't match to a (code, level) pair is dropped; the user fills
 * it in later.
 */

import { type CefrLevel, isCefrLevel } from '../profile';

/** Canonical map of "language name" → ISO-639-1 code across 5 locales. */
const LANG_NAME_TO_CODE: ReadonlyArray<readonly [string, string]> = [
  // English
  ['english', 'en'],
  ['англійська', 'en'],
  ['англ', 'en'],
  ['английский', 'en'],
  ['inglese', 'en'],
  ['angielski', 'en'],
  // Ukrainian
  ['ukrainian', 'uk'],
  ['українська', 'uk'],
  ['украинский', 'uk'],
  ['ucraino', 'uk'],
  ['ukraiński', 'uk'],
  // Russian
  ['russian', 'ru'],
  ['русский', 'ru'],
  ['російська', 'ru'],
  ['russo', 'ru'],
  ['rosyjski', 'ru'],
  // Italian
  ['italian', 'it'],
  ['итальянский', 'it'],
  ['італійська', 'it'],
  ['italiano', 'it'],
  ['włoski', 'it'],
  // Polish
  ['polish', 'pl'],
  ['польский', 'pl'],
  ['польська', 'pl'],
  ['polacco', 'pl'],
  ['polski', 'pl'],
  // German
  ['german', 'de'],
  ['немецкий', 'de'],
  ['німецька', 'de'],
  ['deutsch', 'de'],
  ['tedesco', 'de'],
  ['niemiecki', 'de'],
  // French
  ['french', 'fr'],
  ['французский', 'fr'],
  ['французька', 'fr'],
  ['français', 'fr'],
  ['francuski', 'fr'],
  ['francese', 'fr'],
  // Spanish
  ['spanish', 'es'],
  ['испанский', 'es'],
  ['іспанська', 'es'],
  ['español', 'es'],
  ['spagnolo', 'es'],
  ['hiszpański', 'es'],
];

const BARE_ISO_CODES = new Set([
  'en',
  'uk',
  'ru',
  'it',
  'pl',
  'de',
  'fr',
  'es',
  'nl',
  'pt',
  'tr',
  'ja',
  'zh',
  'ar',
  'hi',
]);

/**
 * `\b` in ECMAScript regex uses ASCII word characters only even with the `u`
 * flag — "рідна" doesn't trigger a boundary. Unicode-safe lookaround on
 * `\p{L}` replaces `\b` wherever Cyrillic / Italian accented tokens are in
 * play.
 */
const CEFR_TOKEN_RE = /(?<!\p{L})([abcABC][12])(?!\p{L})/u;
const NATIVE_RE = /(?<!\p{L})(native|рідна|родной|родная|madrelingua|ojczysty|mutter)(?!\p{L})/iu;
const FLUENT_RE = /(?<!\p{L})(fluent|свободно|fluente|biegle|fließend)(?!\p{L})/iu;
const INTERMEDIATE_RE = /(?<!\p{L})(intermediate|intermedio|средний|середній|średni)(?!\p{L})/iu;
const BASIC_RE = /(?<!\p{L})(basic|basico|базовый|базова|podstawowy)(?!\p{L})/iu;

const ENTRY_DELIMITERS = /[,\n•·|;/]+/;
const MAX_LANGUAGES = 20;

export interface LanguageEntryOut {
  readonly code: string;
  readonly level: CefrLevel;
}

export function extractLanguages(languagesBody: string): readonly LanguageEntryOut[] {
  const body = languagesBody.trim();
  if (body.length === 0) return [];
  const entries = body
    .split(ENTRY_DELIMITERS)
    .map((e) => stripBulletPrefix(e).trim())
    .filter(Boolean);

  const out: LanguageEntryOut[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    const parsed = parseLanguageEntry(entry);
    if (!parsed) continue;
    if (seen.has(parsed.code)) continue;
    seen.add(parsed.code);
    out.push(parsed);
    if (out.length >= MAX_LANGUAGES) break;
  }
  return out;
}

function parseLanguageEntry(raw: string): LanguageEntryOut | null {
  const lower = raw.toLowerCase();
  const code = resolveLanguageCode(lower);
  if (!code) return null;
  const level = resolveLevel(raw, lower);
  if (!level) return null;
  return { code, level };
}

function resolveLanguageCode(lower: string): string | undefined {
  for (const [name, code] of LANG_NAME_TO_CODE) {
    if (lower.includes(name)) return code;
  }
  const iso = /\b([a-z]{2})\b/.exec(lower);
  if (iso?.[1] && BARE_ISO_CODES.has(iso[1])) return iso[1];
  return undefined;
}

function resolveLevel(raw: string, lower: string): CefrLevel | undefined {
  if (NATIVE_RE.test(lower)) return 'C2';
  const m = CEFR_TOKEN_RE.exec(raw);
  if (m?.[1]) {
    const upper = m[1].toUpperCase();
    if (isCefrLevel(upper)) return upper;
  }
  if (FLUENT_RE.test(lower)) return 'C1';
  if (INTERMEDIATE_RE.test(lower)) return 'B2';
  if (BASIC_RE.test(lower)) return 'A2';
  return undefined;
}

function stripBulletPrefix(s: string): string {
  return s.replace(/^[\s•·*\-–—]+/, '');
}
