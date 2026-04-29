'use client';

import { useEffect } from 'react';
import { getWebApp } from './webapp';

/**
 * Owns two responsibilities:
 *   1. data-theme attribute on <html> — drives the MINIMAL light/dark palette
 *      defined in globals.css. Three sources, in priority order:
 *        a. user override in localStorage (`themePref` = 'light' | 'dark')
 *        b. Telegram colorScheme when running inside the Mini App
 *        c. browser `prefers-color-scheme` for outside-Telegram dev
 *   2. Telegram viewport CSS variables (--tg-viewport-height,
 *      --tg-viewport-stable-height) so <Screen> sizes correctly.
 *
 * Color themeParams are intentionally NOT bridged — MINIMAL palette is the
 * single source of truth.
 *
 * Settings page dispatches a `theme-pref-changed` window event after writing
 * to localStorage so this bridge re-applies without a page reload.
 */
export const THEME_PREF_STORAGE_KEY = 'themePref';
export const THEME_PREF_EVENT = 'theme-pref-changed';
export type ThemePref = 'light' | 'dark' | 'auto';

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(THEME_PREF_STORAGE_KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch {
    // Storage may be unavailable (privacy mode); fall back to auto.
  }
  return 'auto';
}

export function ThemeBridge(): null {
  useEffect(() => {
    const root = document.documentElement;
    const wa = getWebApp();
    let cleanupAuto: (() => void) | undefined;

    const applyAuto = (): void => {
      cleanupAuto?.();
      cleanupAuto = undefined;
      if (wa) {
        const apply = (): void => root.setAttribute('data-theme', wa.colorScheme);
        apply();
        wa.onEvent('themeChanged', apply);
        cleanupAuto = () => wa.offEvent('themeChanged', apply);
        return;
      }
      const media = window.matchMedia('(prefers-color-scheme: light)');
      const apply = (): void => root.setAttribute('data-theme', media.matches ? 'light' : 'dark');
      apply();
      media.addEventListener('change', apply);
      cleanupAuto = () => media.removeEventListener('change', apply);
    };

    const applyPref = (): void => {
      const pref = readPref();
      if (pref === 'auto') {
        applyAuto();
      } else {
        cleanupAuto?.();
        cleanupAuto = undefined;
        root.setAttribute('data-theme', pref);
      }
    };

    // Always wire viewport vars from Telegram (independent of theme pref).
    if (wa) {
      const applyViewport = (): void => {
        root.style.setProperty('--tg-viewport-height', `${wa.viewportHeight}px`);
        root.style.setProperty('--tg-viewport-stable-height', `${wa.viewportStableHeight}px`);
      };
      applyViewport();
      wa.onEvent('viewportChanged', applyViewport);
    }

    applyPref();

    // Re-apply when:
    //  - settings screen writes a new pref (custom event)
    //  - another tab changes the pref (storage event)
    const onPrefChanged = (): void => applyPref();
    const onStorage = (e: StorageEvent): void => {
      if (e.key === THEME_PREF_STORAGE_KEY) applyPref();
    };
    window.addEventListener(THEME_PREF_EVENT, onPrefChanged);
    window.addEventListener('storage', onStorage);

    return () => {
      cleanupAuto?.();
      window.removeEventListener(THEME_PREF_EVENT, onPrefChanged);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return null;
}
