import { jwtVerify } from 'jose';
import { describe, expect, it } from 'vitest';

// server-only is a no-op in tests; the module imports it as a runtime guard for Next.
// For Vitest we substitute the guard with an empty module via the pkg's implementation.
import { signSupabaseJwt } from './jwt';

const SECRET = 'super-secret-jwt-string-that-is-long-enough';

describe('signSupabaseJwt', () => {
  it('signs a JWT with sub, role, iss, iat, exp', async () => {
    const fixedNow = 1_717_000_000;
    const { jwt, issuedAt, expiresAt } = await signSupabaseJwt('user-123', {
      secret: SECRET,
      nowSeconds: () => fixedNow,
    });

    expect(jwt.split('.')).toHaveLength(3);
    expect(issuedAt.toISOString()).toBe(new Date(fixedNow * 1000).toISOString());
    expect(expiresAt.toISOString()).toBe(new Date((fixedNow + 15 * 60) * 1000).toISOString());

    const { payload } = await jwtVerify(jwt, new TextEncoder().encode(SECRET), {
      currentDate: new Date(fixedNow * 1000),
    });
    expect(payload.sub).toBe('user-123');
    expect(payload.role).toBe('authenticated');
    expect(payload.iss).toBe('supabase');
    expect(payload.iat).toBe(fixedNow);
    expect(payload.exp).toBe(fixedNow + 15 * 60);
  });

  it('honours custom expiresInSeconds', async () => {
    const fixedNow = 1_717_000_000;
    const { expiresAt } = await signSupabaseJwt('u-2', {
      secret: SECRET,
      expiresInSeconds: 60,
      nowSeconds: () => fixedNow,
    });
    expect(expiresAt.toISOString()).toBe(new Date((fixedNow + 60) * 1000).toISOString());
  });

  it('rejects verification when signed with a different secret', async () => {
    const fixedNow = 1_717_000_000;
    const { jwt } = await signSupabaseJwt('u-3', {
      secret: SECRET,
      nowSeconds: () => fixedNow,
    });
    await expect(
      jwtVerify(jwt, new TextEncoder().encode('wrong-secret'), {
        currentDate: new Date(fixedNow * 1000),
      }),
    ).rejects.toThrow();
  });

  it('throws when userId is empty', async () => {
    await expect(signSupabaseJwt('', { secret: SECRET })).rejects.toThrow();
  });

  it('throws when secret is missing', async () => {
    await expect(signSupabaseJwt('u', { secret: '' })).rejects.toThrow();
  });
});
