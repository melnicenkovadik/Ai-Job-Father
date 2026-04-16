import type { ReactNode } from 'react';
import '../globals.css';

/**
 * Bare dev layout — no Mini App chrome (no TelegramProvider, no AuthGate, no
 * i18n client provider). Keeps fixture visuals deterministic for Playwright.
 */
export default function DevLayout({ children }: { children: ReactNode }) {
  return <div className="bg-[var(--color-bg)] text-[var(--color-text)]">{children}</div>;
}
