'use client';

import { applySupabaseJwt } from '@/lib/supabase/browser';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { type ReactNode, useEffect, useState } from 'react';
import { getWebApp } from './webapp';

export interface SessionUser {
  id: string;
  telegramId: number;
  locale: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  isPremium: boolean;
}

export interface SessionResponse {
  jwt: string;
  expiresAt: string;
  user: SessionUser;
}

const KNOWN_ERROR_CODES = new Set([
  'missing_init_data',
  'stale_init_data',
  'invalid_signature',
  'malformed_init_data',
  'telegram_env_missing',
  'vercel_protection',
  'internal',
  'network_error',
]);

class SessionRequestError extends Error {
  readonly status: number | null;
  readonly detail: string | undefined;
  readonly bodySnippet: string | undefined;
  constructor(opts: {
    code: string;
    status: number | null;
    detail?: string | undefined;
    bodySnippet?: string | undefined;
  }) {
    super(opts.code);
    this.name = 'SessionRequestError';
    this.status = opts.status;
    this.detail = opts.detail;
    this.bodySnippet = opts.bodySnippet;
  }
}

function snippet(text: string, max = 240): string {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

async function postSession(initData: string): Promise<SessionResponse> {
  let res: Response;
  try {
    res = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { Authorization: `Tma ${initData}` },
    });
  } catch (err) {
    throw new SessionRequestError({
      code: 'network_error',
      status: null,
      detail: err instanceof Error ? err.message : String(err),
    });
  }

  if (res.ok) {
    return (await res.json()) as SessionResponse;
  }

  const text = await res.text().catch(() => '');
  let parsed: { error?: string; message?: string } | null = null;
  try {
    parsed = text ? (JSON.parse(text) as { error?: string; message?: string }) : null;
  } catch {
    parsed = null;
  }

  if (
    res.status === 401 &&
    /authentication required|vercel authentication|sso-api|vercel\.com\/sso/i.test(text)
  ) {
    throw new SessionRequestError({
      code: 'vercel_protection',
      status: res.status,
      bodySnippet: snippet(text),
    });
  }

  throw new SessionRequestError({
    code: parsed?.error ?? 'generic',
    status: res.status,
    detail: parsed?.message,
    bodySnippet: parsed ? undefined : snippet(text),
  });
}

/**
 * Wraps the Mini App route group. On mount it grabs raw `initData` from the
 * Telegram WebApp global, POSTs it to `/api/auth/session`, applies the
 * returned Supabase JWT to the browser client, and stashes the session
 * payload under the `['session']` query key for downstream hooks.
 *
 * Rendered states:
 *   - bootstrap:    initial paint before we've inspected `window.Telegram`
 *   - missing:      running outside Telegram (no `initData`)
 *   - pending:      session POST in flight
 *   - error:        server returned 4xx/5xx — shows code + HTTP status + body snippet
 *   - ready:        children render
 */
export function AuthGate({ children }: { children: ReactNode }): ReactNode {
  const t = useTranslations('auth');
  const queryClient = useQueryClient();
  const [initData, setInitData] = useState<string | undefined>(undefined);
  const [inspected, setInspected] = useState(false);

  useEffect(() => {
    const raw = getWebApp()?.initData;
    setInitData(raw && raw.length > 0 ? raw : undefined);
    setInspected(true);
  }, []);

  const session = useMutation<SessionResponse, Error, string>({
    mutationFn: postSession,
    onSuccess: async (data) => {
      await applySupabaseJwt(data.jwt);
      queryClient.setQueryData(['session'], data);
    },
  });

  useEffect(() => {
    if (inspected && initData && !session.data && !session.isPending && !session.error) {
      session.mutate(initData);
    }
  }, [inspected, initData, session]);

  if (!inspected) {
    return <Status message={t('loading')} />;
  }
  if (!initData) {
    return <Status message={t('error.missing_init_data')} />;
  }
  if (session.data) {
    return children;
  }
  if (session.error) {
    const err = session.error;
    const code = err.message;
    const message = KNOWN_ERROR_CODES.has(code) ? t(`error.${code}`) : t('error.generic');
    const diagnostics =
      err instanceof SessionRequestError ? (
        <Diagnostics
          title={t('diagnostics.title')}
          code={code}
          status={err.status}
          detail={err.detail}
          bodySnippet={err.bodySnippet}
        />
      ) : null;
    return (
      <Status
        message={message}
        diagnostics={diagnostics}
        action={
          <button
            type="button"
            onClick={() => session.mutate(initData)}
            className="inline-flex min-h-[2.75rem] items-center justify-center rounded-md bg-[var(--color-button,#2481CC)] px-4 text-sm font-medium text-[var(--color-button-text,#ffffff)]"
          >
            {t('retry')}
          </button>
        }
      />
    );
  }
  return <Status message={t('loading')} />;
}

function Status({
  message,
  action,
  diagnostics,
}: {
  message: string;
  action?: ReactNode;
  diagnostics?: ReactNode;
}): ReactNode {
  return (
    <div className="flex min-h-[var(--tg-viewport-height,100vh)] w-full min-w-0 flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-sm opacity-70 [overflow-wrap:anywhere]">{message}</p>
      {action}
      {diagnostics}
    </div>
  );
}

function Diagnostics({
  title,
  code,
  status,
  detail,
  bodySnippet,
}: {
  title: string;
  code: string;
  status: number | null;
  detail: string | undefined;
  bodySnippet: string | undefined;
}): ReactNode {
  return (
    <details className="mt-2 w-full max-w-sm min-w-0 rounded-md border border-[var(--color-hint,#94a3b8)]/30 px-3 py-2 text-left text-[11px] opacity-70">
      <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-wide">
        {title}
      </summary>
      <dl className="mt-2 space-y-1 font-mono [overflow-wrap:anywhere]">
        {status !== null && <div>HTTP {status}</div>}
        <div>code: {code}</div>
        {detail ? <div>msg: {detail}</div> : null}
        {bodySnippet ? (
          <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-all rounded bg-[var(--color-hint,#94a3b8)]/10 p-2">
            {bodySnippet}
          </pre>
        ) : null}
      </dl>
    </details>
  );
}
