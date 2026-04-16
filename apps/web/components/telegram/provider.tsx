'use client';

import { getQueryClient } from '@/lib/query-client';
import { QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useEffect } from 'react';
import { AuthGate } from './auth-gate';
import { ThemeBridge } from './theme-bridge';
import { getWebApp } from './webapp';

/**
 * Single wrapper for the Mini App route group. Composes:
 *   - TanStack Query provider (shared cache for session + future server state)
 *   - ThemeBridge (Telegram themeParams + viewport → CSS variables)
 *   - AuthGate (initData → `/api/auth/session` → Supabase JWT)
 *
 * Lives in `(app)/layout.tsx`; intentionally NOT at the root layout so `/api/*`
 * routes and `/(dev)/*` fixtures stay provider-free.
 */
export function TelegramProvider({ children }: { children: ReactNode }): ReactNode {
  const queryClient = getQueryClient();

  useEffect(() => {
    const wa = getWebApp();
    if (!wa) return;
    wa.ready();
    wa.expand();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeBridge />
      <AuthGate>{children}</AuthGate>
    </QueryClientProvider>
  );
}
