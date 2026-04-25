'use client';

import { getWebApp } from '@/components/telegram/webapp';
import { useEffect } from 'react';
import { Button } from './button';

export interface MainButtonBindingProps {
  text: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** Hide the web fallback even outside Telegram (e.g. when host page renders its own primary action). */
  hideWebFallback?: boolean;
}

/**
 * Binds the page's primary action to the Telegram MainButton inside Telegram
 * and renders a sticky-bottom Button as web fallback. Generic — features pass
 * their own text/handler.
 */
export function MainButtonBinding({
  text,
  onClick,
  disabled = false,
  loading = false,
  hideWebFallback = false,
}: MainButtonBindingProps) {
  useEffect(() => {
    const wa = getWebApp();
    if (!wa) return;
    const btn = wa.MainButton;
    btn.setText(text);
    if (loading) btn.showProgress(false);
    else btn.hideProgress();
    if (disabled || loading) btn.disable();
    else btn.enable();
    btn.onClick(onClick);
    btn.show();
    return () => {
      btn.offClick(onClick);
      btn.hideProgress();
      btn.hide();
    };
  }, [text, onClick, disabled, loading]);

  const insideTelegram = typeof window !== 'undefined' && Boolean(window.Telegram?.WebApp);
  if (insideTelegram || hideWebFallback) return null;

  return (
    <div
      /* layout-safe: web-only fallback for the Telegram MainButton, which sits outside the document flow. */
      className="pointer-events-none fixed inset-x-0 bottom-0 z-20 px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-3"
    >
      <Button
        onClick={onClick}
        disabled={disabled}
        loading={loading}
        fullWidth
        size="lg"
        className="pointer-events-auto"
      >
        {text}
      </Button>
    </div>
  );
}
