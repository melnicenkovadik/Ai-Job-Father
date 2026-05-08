import 'server-only';
import { getServerLogger } from './server';
import { normalizeError } from './types';

/**
 * Wrap any Next.js App-Router route handler so that every request is
 * automatically logged with start / end / exception markers.
 *
 * Layout:
 *   ```ts
 *   export const POST = withApiLogging(
 *     'api/profile.POST',
 *     requireAuth(async (req, { user }) => { ... }),
 *   );
 *   ```
 *
 * What lands in `app_logs`:
 *   - `info  <name> request`   — `{ method, url }` at function entry.
 *   - `info  <name> response`  — `{ status, durationMs }` after the handler returns.
 *   - `error <name> exception` — full stack on uncaught throw, plus
 *     `{ method, url, durationMs }`. The wrapper then surfaces `500 internal`
 *     to the caller (single source of truth for unhandled errors). Handlers
 *     that return their own non-2xx responses are *not* re-logged as
 *     errors — they're business outcomes, not crashes.
 *
 * Composes with `requireAuth`, route-level middlewares, and dynamic
 * params handlers (Next.js's `(req, ctx)` signature is preserved verbatim).
 *
 * NOTE: this is the ONLY place the harness logs request/response shape.
 * Don't manually log "route hit" inside handlers — the wrapper has it.
 * Inside the handler, log domain events ("file received", "credit
 * consumed", etc.) — those are still your responsibility.
 */
// biome-ignore lint/suspicious/noExplicitAny: handler signatures vary across routes
type ApiHandler = (...args: any[]) => Response | Promise<Response>;

export function withApiLogging<H extends ApiHandler>(name: string, handler: H): H {
  const wrapped = (async (...args: Parameters<H>): Promise<Response> => {
    const log = getServerLogger();
    const req = args[0] as Request | undefined;
    const startedAt = Date.now();

    let method = 'UNKNOWN';
    let url: string | undefined;
    if (req && typeof req === 'object' && 'method' in req && 'url' in req) {
      method = String(req.method ?? 'UNKNOWN');
      url = String(req.url);
    }

    log.info({
      context: name,
      message: 'request',
      data: { method, url },
    });

    try {
      const res = await handler(...(args as Parameters<H>));
      const status = res.status;
      const durationMs = Date.now() - startedAt;
      log.info({
        context: name,
        message: 'response',
        data: { method, url, status, durationMs },
      });
      return res;
    } catch (err) {
      const durationMs = Date.now() - startedAt;
      log.error({
        context: name,
        message: 'exception',
        data: { method, url, durationMs },
        error: err,
      });
      // Surface a typed body so clients can branch on `error: 'internal'`
      // without scraping HTML. The normalised error shape (no PII / no
      // stack) lands in the JSON; the full stack stays in app_logs.
      const norm = normalizeError(err);
      return Response.json(
        {
          error: 'internal',
          ...(norm ? { errorName: norm.name } : {}),
        },
        { status: 500 },
      );
    }
  }) as ApiHandler;

  return wrapped as H;
}
