'use client';

import { getWebApp } from '@/components/telegram/webapp';
import { useEffect } from 'react';

interface SaveProfileButtonProps {
  text: string;
  disabled: boolean;
  onClick(): void;
}

/**
 * Binds the page's primary save action to the Telegram MainButton when the
 * app runs inside Telegram, and renders a plain sticky-bottom button on web
 * (e.g. the `(dev)` fixtures or a direct browser visit during development).
 *
 * Both paths call the same `onClick` handler so the component keeps a single
 * source of truth for "save was triggered".
 */
export function SaveProfileButton({ text, disabled, onClick }: SaveProfileButtonProps) {
  useEffect(() => {
    const wa = getWebApp();
    if (!wa) return;
    const btn = wa.MainButton;
    btn.setText(text);
    if (disabled) btn.disable();
    else btn.enable();
    btn.onClick(onClick);
    btn.show();
    return () => {
      btn.offClick(onClick);
      btn.hide();
    };
  }, [text, disabled, onClick]);

  const insideTelegram = typeof window !== 'undefined' && Boolean(window.Telegram?.WebApp);

  if (insideTelegram) return null;

  return (
    <div
      /* layout-safe: this fallback is web-only (insideTelegram === false); the Telegram MainButton sits outside the document flow. */
      className="pointer-events-none fixed inset-x-0 bottom-0 z-20 p-4"
    >
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="pointer-events-auto block min-h-[2.75rem] w-full rounded-lg bg-[var(--color-button,#2481CC)] px-4 text-sm font-medium text-[var(--color-button-text,#ffffff)] disabled:opacity-60"
      >
        {text}
      </button>
    </div>
  );
}
