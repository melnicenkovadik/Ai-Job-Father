import 'server-only';
import type { User } from '@ai-job-bot/core';
import { resolveSession } from './session';
import {
  InvalidInitDataSignatureError,
  MalformedInitDataError,
  StaleInitDataError,
} from './verify-init-data';

export interface AuthContext {
  readonly user: User;
  readonly jwt: string;
  readonly expiresAt: Date;
}

export type AuthedHandler = (req: Request, ctx: AuthContext) => Promise<Response>;

/**
 * Wrap a route handler to require a verified Telegram initData header.
 * Payment endpoints (path contains `/payments/`) tighten `maxAge` to 1h (R-2.3).
 */
export function requireAuth(handler: AuthedHandler): (req: Request) => Promise<Response> {
  return async (req) => {
    const header = req.headers.get('authorization');
    if (!header?.startsWith('Tma ')) {
      return jsonError(401, 'missing_init_data');
    }
    const raw = header.slice(4);
    const isPaymentEndpoint = new URL(req.url).pathname.includes('/payments/');
    const maxAgeSeconds = isPaymentEndpoint ? 60 * 60 : 60 * 60 * 24;

    try {
      const session = await resolveSession(raw, { maxAgeSeconds });
      return handler(req, {
        user: session.user,
        jwt: session.jwt,
        expiresAt: session.expiresAt,
      });
    } catch (err) {
      if (err instanceof StaleInitDataError) return jsonError(401, 'stale_init_data');
      if (err instanceof InvalidInitDataSignatureError) return jsonError(403, 'invalid_signature');
      if (err instanceof MalformedInitDataError) return jsonError(400, 'malformed_init_data');
      throw err;
    }
  };
}

function jsonError(status: number, code: string): Response {
  return Response.json({ error: code }, { status });
}
