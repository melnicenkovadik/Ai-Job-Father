'use client';

import { TonConnectUIProvider } from '@tonconnect/ui-react';
import type { ReactNode } from 'react';

/**
 * Wraps the Mini App tree with TonConnect UI context. The manifest URL points
 * at our own `.well-known/tonconnect-manifest.json` route — wallets call it
 * during the connect handshake to render the dApp's name + icon.
 *
 * Lives in `(app)/layout.tsx` below `<TelegramProvider>` so the SDK has
 * access to the Telegram WebApp init when a TonConnect button is rendered
 * inside the Mini App (the SDK auto-detects and uses Telegram's wallet
 * picker when running in the in-app browser).
 */
export function TonProvider({ children }: { children: ReactNode }): ReactNode {
  const base = (
    process.env.NEXT_PUBLIC_TONCONNECT_MANIFEST_URL ??
    process.env.NEXT_PUBLIC_MINI_APP_URL ??
    'https://ai-job-bot-web.vercel.app'
  ).replace(/\/+$/, '');
  const manifestUrl = base.endsWith('.json')
    ? base
    : `${base}/.well-known/tonconnect-manifest.json`;
  return <TonConnectUIProvider manifestUrl={manifestUrl}>{children}</TonConnectUIProvider>;
}
