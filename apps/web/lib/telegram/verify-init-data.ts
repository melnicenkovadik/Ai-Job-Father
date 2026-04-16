import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Errors raised by `verifyInitData`. Consumers pattern-match on the class name
 * and translate to HTTP status (401 for stale, 403 for forgery, 400 for malformed).
 */
export class InvalidInitDataSignatureError extends Error {
  constructor() {
    super('Telegram initData signature mismatch');
    this.name = 'InvalidInitDataSignatureError';
  }
}

export class StaleInitDataError extends Error {
  constructor(public readonly ageSeconds: number) {
    super(`Telegram initData is stale (age=${ageSeconds}s)`);
    this.name = 'StaleInitDataError';
  }
}

export class MalformedInitDataError extends Error {
  constructor(reason: string) {
    super(`Telegram initData is malformed: ${reason}`);
    this.name = 'MalformedInitDataError';
  }
}

export interface TelegramUser {
  readonly id: number;
  readonly first_name?: string;
  readonly last_name?: string;
  readonly username?: string;
  readonly language_code?: string;
  readonly is_premium?: boolean;
  readonly photo_url?: string;
  readonly allows_write_to_pm?: boolean;
}

export interface VerifiedInitData {
  readonly user: TelegramUser;
  readonly authDate: number;
  readonly queryId?: string | undefined;
  readonly startParam?: string | undefined;
  /** Original hex signature from Telegram. */
  readonly hash: string;
}

export interface VerifyInitDataOptions {
  readonly botToken: string;
  readonly maxAgeSeconds: number;
  /** Override `Date.now()`-based `nowSeconds()` for tests. */
  readonly nowSeconds?: () => number;
}

/**
 * Verify Telegram Web App `initData` per
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * Algorithm:
 * 1. Parse `URLSearchParams` from the raw string.
 * 2. Extract `hash`; remove from pairs.
 * 3. Build `dataCheckString` = sorted `key=value` joined with `\n`.
 * 4. `secretKey = HMAC_SHA256(key='WebAppData', data=botToken)`
 * 5. `computed = HMAC_SHA256(key=secretKey, data=dataCheckString)` in hex.
 * 6. `timingSafeEqual(computed, hash)`.
 * 7. Check `auth_date` freshness against `nowSeconds() - maxAgeSeconds`.
 */
export function verifyInitData(rawInitData: string, opts: VerifyInitDataOptions): VerifiedInitData {
  if (typeof rawInitData !== 'string' || rawInitData.length === 0) {
    throw new MalformedInitDataError('empty');
  }

  let params: URLSearchParams;
  try {
    params = new URLSearchParams(rawInitData);
  } catch (err) {
    throw new MalformedInitDataError(`parse error: ${(err as Error).message}`);
  }

  const hash = params.get('hash');
  if (!hash) throw new MalformedInitDataError('missing hash');
  params.delete('hash');

  const pairs: Array<[string, string]> = [];
  for (const [k, v] of params) pairs.push([k, v]);
  pairs.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const dataCheckString = pairs.map(([k, v]) => `${k}=${v}`).join('\n');

  const secretKey = createHmac('sha256', 'WebAppData').update(opts.botToken).digest();
  const computedHex = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  const expected = Buffer.from(computedHex, 'utf8');
  const provided = Buffer.from(hash.toLowerCase(), 'utf8');
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    throw new InvalidInitDataSignatureError();
  }

  const authDateStr = params.get('auth_date');
  if (!authDateStr) throw new MalformedInitDataError('missing auth_date');
  const authDate = Number(authDateStr);
  if (!Number.isInteger(authDate) || authDate <= 0) {
    throw new MalformedInitDataError('invalid auth_date');
  }

  const now = opts.nowSeconds ? opts.nowSeconds() : Math.floor(Date.now() / 1000);
  const age = now - authDate;
  if (age > opts.maxAgeSeconds) {
    throw new StaleInitDataError(age);
  }

  const userRaw = params.get('user');
  if (!userRaw) throw new MalformedInitDataError('missing user');
  let user: TelegramUser;
  try {
    const parsed = JSON.parse(userRaw) as TelegramUser;
    if (typeof parsed?.id !== 'number') throw new Error('user.id is not a number');
    user = parsed;
  } catch (err) {
    throw new MalformedInitDataError(`user JSON: ${(err as Error).message}`);
  }

  const queryId = params.get('query_id') ?? undefined;
  const startParam = params.get('start_param') ?? undefined;

  return { user, authDate, queryId, startParam, hash };
}
