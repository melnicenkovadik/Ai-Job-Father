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
]);

async function postSession(initData: string): Promise<SessionResponse> {
  const res = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { Authorization: `Tma ${initData}` },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? 'generic');
  }
  return (await res.json()) as SessionResponse;
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
 *   - error:        server returned 4xx (stale, invalid, malformed, missing)
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
    const code = session.error.message;
    const message = KNOWN_ERROR_CODES.has(code) ? t(`error.${code}`) : t('error.generic');
    return (
      <Status
        message={message}
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

function Status({ message, action }: { message: string; action?: ReactNode }): ReactNode {
  return (
    <div className="flex min-h-[var(--tg-viewport-height,100vh)] w-full min-w-0 flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-sm opacity-70 [overflow-wrap:anywhere]">{message}</p>
      {action}
    </div>
  );
}
