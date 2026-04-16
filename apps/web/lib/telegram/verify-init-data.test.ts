import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  InvalidInitDataSignatureError,
  MalformedInitDataError,
  StaleInitDataError,
  verifyInitData,
} from './verify-init-data';

const BOT_TOKEN = '123456:TEST-bot-token-AAABBBCCC';

type FixturePairs = Record<string, string>;

function signInitData(pairs: FixturePairs, botToken = BOT_TOKEN): string {
  const entries = Object.entries(pairs).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');
  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  const url = new URLSearchParams();
  for (const [k, v] of entries) url.append(k, v);
  url.append('hash', hash);
  return url.toString();
}

function freshPairs(overrides: Partial<FixturePairs> = {}): FixturePairs {
  return {
    auth_date: String(Math.floor(Date.now() / 1000)),
    query_id: 'q-1',
    user: JSON.stringify({
      id: 42,
      first_name: 'Vadym',
      last_name: 'M.',
      username: 'vad',
      language_code: 'uk',
      is_premium: false,
    }),
    ...overrides,
  };
}

describe('verifyInitData', () => {
  it('parses valid signed initData', () => {
    const initData = signInitData(freshPairs());
    const result = verifyInitData(initData, { botToken: BOT_TOKEN, maxAgeSeconds: 86400 });
    expect(result.user.id).toBe(42);
    expect(result.user.first_name).toBe('Vadym');
    expect(result.user.language_code).toBe('uk');
    expect(result.queryId).toBe('q-1');
  });

  it('captures start_param when present', () => {
    const initData = signInitData(freshPairs({ start_param: 'wizard' }));
    const result = verifyInitData(initData, { botToken: BOT_TOKEN, maxAgeSeconds: 86400 });
    expect(result.startParam).toBe('wizard');
  });

  it('throws InvalidInitDataSignatureError when payload is tampered', () => {
    const initData = signInitData(freshPairs());
    // Replace the encoded user id (42 → 999) without re-signing.
    const params = new URLSearchParams(initData);
    const userJson = params.get('user') as string;
    params.set('user', userJson.replace('"id":42', '"id":999'));
    const tampered = params.toString();
    expect(() =>
      verifyInitData(tampered, { botToken: BOT_TOKEN, maxAgeSeconds: 86400 }),
    ).toThrow(InvalidInitDataSignatureError);
  });

  it('throws InvalidInitDataSignatureError when signed with a different bot token', () => {
    const initData = signInitData(freshPairs(), 'different:token');
    expect(() =>
      verifyInitData(initData, { botToken: BOT_TOKEN, maxAgeSeconds: 86400 }),
    ).toThrow(InvalidInitDataSignatureError);
  });

  it('throws StaleInitDataError when auth_date is older than maxAge', () => {
    const staleTs = Math.floor(Date.now() / 1000) - 10_000;
    const initData = signInitData(freshPairs({ auth_date: String(staleTs) }));
    expect(() =>
      verifyInitData(initData, { botToken: BOT_TOKEN, maxAgeSeconds: 60 }),
    ).toThrow(StaleInitDataError);
  });

  it('accepts initData exactly at the freshness boundary', () => {
    const now = 1_717_000_000;
    const initData = signInitData({ ...freshPairs(), auth_date: String(now - 60) });
    const result = verifyInitData(initData, {
      botToken: BOT_TOKEN,
      maxAgeSeconds: 60,
      nowSeconds: () => now,
    });
    expect(result.authDate).toBe(now - 60);
  });

  it('throws MalformedInitDataError when hash is missing', () => {
    const raw = new URLSearchParams(freshPairs()).toString();
    expect(() => verifyInitData(raw, { botToken: BOT_TOKEN, maxAgeSeconds: 86400 })).toThrow(
      MalformedInitDataError,
    );
  });

  it('throws MalformedInitDataError when auth_date is missing', () => {
    const p = freshPairs();
    delete (p as Partial<FixturePairs>).auth_date;
    const initData = signInitData(p as FixturePairs);
    expect(() => verifyInitData(initData, { botToken: BOT_TOKEN, maxAgeSeconds: 86400 })).toThrow(
      MalformedInitDataError,
    );
  });

  it('throws MalformedInitDataError when user JSON is invalid', () => {
    const initData = signInitData(freshPairs({ user: '{not-json' }));
    expect(() => verifyInitData(initData, { botToken: BOT_TOKEN, maxAgeSeconds: 86400 })).toThrow(
      MalformedInitDataError,
    );
  });

  it('throws MalformedInitDataError on empty string', () => {
    expect(() => verifyInitData('', { botToken: BOT_TOKEN, maxAgeSeconds: 86400 })).toThrow(
      MalformedInitDataError,
    );
  });

  it('accepts uppercase hash (case-insensitive compare)', () => {
    const initData = signInitData(freshPairs());
    // Replace hash value with uppercase version
    const params = new URLSearchParams(initData);
    const h = params.get('hash');
    expect(h).toBeTruthy();
    params.set('hash', (h as string).toUpperCase());
    const result = verifyInitData(params.toString(), {
      botToken: BOT_TOKEN,
      maxAgeSeconds: 86400,
    });
    expect(result.user.id).toBe(42);
  });

  it('exposes is_premium when provided', () => {
    const initData = signInitData(
      freshPairs({
        user: JSON.stringify({ id: 5, first_name: 'P', is_premium: true }),
      }),
    );
    const result = verifyInitData(initData, { botToken: BOT_TOKEN, maxAgeSeconds: 86400 });
    expect(result.user.is_premium).toBe(true);
  });
});
