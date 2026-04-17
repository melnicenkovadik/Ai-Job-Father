'use client';

import { getWebApp } from '@/components/telegram/webapp';

export class MissingInitDataError extends Error {
  constructor() {
    super('Telegram initData is not available in this runtime.');
    this.name = 'MissingInitDataError';
  }
}

/**
 * `fetch` wrapper that attaches the Mini App `initData` as an
 * `Authorization: Tma <raw>` header — the shape the server's `requireAuth`
 * middleware accepts. Call from client components only.
 */
export async function authedFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const raw = getWebApp()?.initData;
  if (!raw || raw.length === 0) throw new MissingInitDataError();
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Tma ${raw}`);
  return fetch(input, { ...init, headers });
}
