/**
 * Form-field validators for client-side UI feedback.
 *
 * Server validation is the source of truth (zod schemas in `lib/profile/schema.ts`).
 * These exist to give the user a red border + inline error BEFORE they hit Save —
 * so they don't burn a round-trip on a bad email format.
 *
 * Each validator returns `undefined` when the value is acceptable (empty
 * counts as acceptable for optional fields — call validateNonEmpty first if
 * the field is required) and a translation-key suffix string when invalid.
 * Caller maps the suffix via `t(`validation.${suffix}`)`.
 */

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const E164_RX = /^\+?[0-9][0-9\s\-().]{6,30}$/;

export function validateEmail(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  if (trimmed.length > 200) return 'tooLong';
  return EMAIL_RX.test(trimmed) ? undefined : 'invalidEmail';
}

export function validatePhone(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  if (trimmed.length > 60) return 'tooLong';
  return E164_RX.test(trimmed) ? undefined : 'invalidPhone';
}

export function validateUrl(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  if (trimmed.length > 500) return 'tooLong';
  try {
    const u = new URL(trimmed);
    return u.protocol === 'http:' || u.protocol === 'https:' ? undefined : 'invalidUrl';
  } catch {
    return 'invalidUrl';
  }
}

export function validateLinkedinUrl(value: string): string | undefined {
  const base = validateUrl(value);
  if (base !== undefined) return base;
  if (value.trim().length === 0) return undefined;
  try {
    const u = new URL(value.trim());
    return u.hostname.endsWith('linkedin.com') ? undefined : 'notLinkedin';
  } catch {
    return 'invalidUrl';
  }
}

export function validateGithubUrl(value: string): string | undefined {
  const base = validateUrl(value);
  if (base !== undefined) return base;
  if (value.trim().length === 0) return undefined;
  try {
    const u = new URL(value.trim());
    return u.hostname.endsWith('github.com') ? undefined : 'notGithub';
  } catch {
    return 'invalidUrl';
  }
}

export function validateNonEmpty(value: string, opts: { max?: number } = {}): string | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) return 'required';
  if (opts.max !== undefined && trimmed.length > opts.max) return 'tooLong';
  return undefined;
}
