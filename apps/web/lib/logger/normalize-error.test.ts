import { describe, expect, it } from 'vitest';
import { normalizeError } from './types';

describe('normalizeError', () => {
  it('returns undefined for null/undefined', () => {
    expect(normalizeError(undefined)).toBeUndefined();
    expect(normalizeError(null)).toBeUndefined();
  });

  it('preserves Error instances exactly', () => {
    const e = new TypeError('boom');
    const out = normalizeError(e);
    expect(out?.name).toBe('TypeError');
    expect(out?.message).toBe('boom');
    expect(out?.stack).toContain('boom');
  });

  it('extracts message from Supabase PostgrestError-shaped objects', () => {
    const err = {
      message: 'duplicate key value violates unique constraint',
      code: '23505',
      details: 'Key (email)=(a@b.com) already exists.',
      hint: null,
    };
    const out = normalizeError(err);
    expect(out?.message).toContain('duplicate key value');
    expect(out?.message).toContain('code=23505');
    expect(out?.message).toContain('details=Key (email)');
  });

  it('handles errors with hint but no details', () => {
    const err = {
      message: 'permission denied',
      code: '42501',
      hint: 'check RLS policies',
    };
    const out = normalizeError(err);
    expect(out?.message).toContain('permission denied');
    expect(out?.message).toContain('hint=check RLS policies');
  });

  it('falls back to JSON for objects with no message', () => {
    const err = { foo: 'bar', n: 1 };
    const out = normalizeError(err);
    expect(out?.name).toBe('NonError');
    // safeJson output, not the dreaded "[object Object]".
    expect(out?.message).toMatch(/foo/);
    expect(out?.message).toMatch(/bar/);
  });

  it('keeps custom name when present on plain object', () => {
    const err = { name: 'PostgrestError', message: 'no rows' };
    const out = normalizeError(err);
    expect(out?.name).toBe('PostgrestError');
    expect(out?.message).toBe('no rows');
  });

  it('handles strings, numbers, booleans through String fallback', () => {
    expect(normalizeError('boom')?.message).toBe('boom');
    expect(normalizeError(42)?.message).toBe('42');
    expect(normalizeError(true)?.message).toBe('true');
  });

  it('captures error.stack when available on plain object', () => {
    const err = { name: 'X', message: 'm', stack: 'X: m\n  at foo' };
    expect(normalizeError(err)?.stack).toContain('at foo');
  });
});
