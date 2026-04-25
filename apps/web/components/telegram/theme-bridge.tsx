'use client';

import { useEffect } from 'react';
import { getWebApp } from './webapp';

/**
 * Owns two responsibilities:
 *   1. data-theme attribute on <html> — drives the MINIMAL light/dark palette
 *      defined in globals.css. Inside Telegram: from `colorScheme`. Outside
 *      Telegram (browser dev): from `prefers-color-scheme`.
 *   2. Telegram viewport CSS variables (--tg-viewport-height,
 *      --tg-viewport-stable-height) so <Screen> sizes correctly.
 *
 * Color themeParams are intentionally NOT bridged — MINIMAL palette is the
 * single source of truth. Users with custom Telegram themes still get the
 * MINIMAL look so the brand identity stays consistent.
 */
export function ThemeBridge(): null {
  useEffect(() => {
    const root = document.documentElement;
    const wa = getWebApp();

    if (wa) {
      const apply = (): void => {
        root.setAttribute('data-theme', wa.colorScheme);
        root.style.setProperty('--tg-viewport-height', `${wa.viewportHeight}px`);
        root.style.setProperty('--tg-viewport-stable-height', `${wa.viewportStableHeight}px`);
      };
      apply();
      wa.onEvent('themeChanged', apply);
      wa.onEvent('viewportChanged', apply);
      return () => {
        wa.offEvent('themeChanged', apply);
        wa.offEvent('viewportChanged', apply);
      };
    }

    const media = window.matchMedia('(prefers-color-scheme: light)');
    const applyBrowser = (): void => {
      root.setAttribute('data-theme', media.matches ? 'light' : 'dark');
    };
    applyBrowser();
    media.addEventListener('change', applyBrowser);
    return () => {
      media.removeEventListener('change', applyBrowser);
    };
  }, []);

  return null;
}
