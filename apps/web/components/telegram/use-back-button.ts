'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { getWebApp } from './webapp';

export type BackButtonTarget = string | (() => void);

/**
 * Wire the Telegram WebApp BackButton.
 *
 * Pass a `string` for the common "go to URL" behavior, or a callback for
 * cases where the back action is dynamic (e.g. wizard step decrements before
 * leaving the page).
 *
 * Outside Telegram (e.g. direct browser visit during dev) this is a no-op;
 * pages that need a web back button should render their own header link.
 */
export function useTelegramBackButton(target: BackButtonTarget): void {
  const router = useRouter();
  useEffect(() => {
    const wa = getWebApp();
    if (!wa) return;
    const handler = () => {
      if (typeof target === 'function') target();
      else router.push(target);
    };
    wa.BackButton.onClick(handler);
    wa.BackButton.show();
    return () => {
      wa.BackButton.offClick(handler);
      wa.BackButton.hide();
    };
  }, [router, target]);
}
