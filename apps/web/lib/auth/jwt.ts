import 'server-only';
import { SignJWT } from 'jose';

export interface SignSupabaseJwtOptions {
  readonly secret: string;
  readonly expiresInSeconds?: number;
  readonly issuer?: string;
  readonly role?: 'authenticated' | 'anon';
  /** Override `Date.now()/1000` for deterministic tests. */
  readonly nowSeconds?: () => number;
}

export interface SignedJwt {
  readonly jwt: string;
  readonly expiresAt: Date;
  readonly issuedAt: Date;
}

/**
 * Sign a short-lived Supabase-compatible JWT claiming `sub = userId` and
 * `role = 'authenticated'`. Supabase accepts this when `SUPABASE_JWT_SECRET`
 * matches its configured secret (default in local stack).
 *
 * Default expiry: 15 minutes (D1.8). Silent re-auth on 401 re-sends initData.
 */
export async function signSupabaseJwt(
  userId: string,
  opts: SignSupabaseJwtOptions,
): Promise<SignedJwt> {
  if (!userId || typeof userId !== 'string') {
    throw new Error('signSupabaseJwt: userId must be a non-empty string');
  }
  if (!opts.secret) {
    throw new Error('signSupabaseJwt: secret is required');
  }
  const expiresInSeconds = opts.expiresInSeconds ?? 15 * 60;
  const now = opts.nowSeconds ? opts.nowSeconds() : Math.floor(Date.now() / 1000);
  const exp = now + expiresInSeconds;
  const secretKey = new TextEncoder().encode(opts.secret);

  const jwt = await new SignJWT({ role: opts.role ?? 'authenticated' })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(userId)
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .setIssuer(opts.issuer ?? 'supabase')
    .sign(secretKey);

  return {
    jwt,
    issuedAt: new Date(now * 1000),
    expiresAt: new Date(exp * 1000),
  };
}
