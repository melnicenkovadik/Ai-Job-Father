'use client';

import { getWebApp } from '@/components/telegram/webapp';
import { Spinner } from '@/components/ui';
import { useEffect } from 'react';

interface SaveProfileButtonProps {
  text: string;
  disabled: boolean;
  loading?: boolean;
  onClick(): void;
}

/**
 * Binds the page's primary save action to the Telegram MainButton when the
 * app runs inside Telegram, and renders a plain sticky-bottom button on web
 * (e.g. the `(dev)` fixtures or a direct browser visit during development).
 *
 * Both paths call the same `onClick` handler so the component keeps a single
 * source of truth for "save was triggered". The Telegram MainButton has its
 * own native progress indicator (showProgress) — we drive it from `loading`.
 */
export function SaveProfileButton({
  text,
  disabled,
  loading = false,
  onClick,
}: SaveProfileButtonProps) {
  useEffect(() => {
    const wa = getWebApp();
    if (!wa) return;
    const btn = wa.MainButton;
    btn.setText(text);
    if (disabled) btn.disable();
    else btn.enable();
    if (loading) btn.showProgress?.(false);
    else btn.hideProgress?.();
    btn.onClick(onClick);
    btn.show();
    return () => {
      btn.offClick(onClick);
      btn.hide();
      btn.hideProgress?.();
    };
  }, [text, disabled, loading, onClick]);

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
        className="pointer-events-auto flex min-h-[2.75rem] w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-button,#2481CC)] px-4 text-sm font-medium text-[var(--color-button-text,#ffffff)] disabled:opacity-60"
      >
        {loading ? <Spinner size={14} /> : null}
        <span>{text}</span>
      </button>
    </div>
  );
}
