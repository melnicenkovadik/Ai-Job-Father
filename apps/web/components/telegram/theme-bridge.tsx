'use client';

import { useEffect } from 'react';
import { getWebApp } from './webapp';

/**
 * Bridges Telegram `themeParams` + viewport into CSS variables.
 * Runs on mount, re-applies on `themeChanged` + `viewportChanged` events.
 * Graceful no-op when rendered outside Telegram WebApp.
 */
export function ThemeBridge(): null {
  useEffect(() => {
    const wa = getWebApp();
    if (!wa) return;

    const apply = (): void => {
      const root = document.documentElement;
      const tp = wa.themeParams;
      const set = (token: string, value?: string): void => {
        if (value) root.style.setProperty(token, value);
      };
      set('--color-bg', tp.bg_color);
      set('--color-text', tp.text_color);
      set('--color-hint', tp.hint_color);
      set('--color-link', tp.link_color);
      set('--color-button', tp.button_color);
      set('--color-button-text', tp.button_text_color);
      set('--color-bg-secondary', tp.secondary_bg_color);
      set('--color-accent', tp.accent_text_color);
      set('--color-destructive', tp.destructive_text_color);
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
  }, []);

  return null;
}
