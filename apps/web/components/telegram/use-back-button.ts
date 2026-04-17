'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { getWebApp } from './webapp';

/**
 * Wire the Telegram WebApp BackButton to a Next.js route.
 * Shows the button on mount, hides on unmount — so each page owns its own
 * navigation target and the chrome doesn't leak between screens.
 *
 * Outside Telegram (e.g. direct browser visit during dev) this is a no-op;
 * pages that need a web back button should render their own header link.
 */
export function useTelegramBackButton(targetHref: string): void {
  const router = useRouter();
  useEffect(() => {
    const wa = getWebApp();
    if (!wa) return;
    const handler = () => router.push(targetHref);
    wa.BackButton.onClick(handler);
    wa.BackButton.show();
    return () => {
      wa.BackButton.offClick(handler);
      wa.BackButton.hide();
    };
  }, [router, targetHref]);
}
