'use client';
import { SUPPORTED_LOCALES } from '@ai-job-bot/core';

/**
 * Dev-only locale switcher used while iterating on the 5-locale wrap-first
 * workflow. Renders `null` in production — the real settings UI lands Phase 5.
 */
export function LocaleSwitcher() {
  if (process.env.NODE_ENV !== 'development') return null;

  const onChange = (locale: string) => {
    const thirtyDays = 60 * 60 * 24 * 30;
    document.cookie = `locale=${locale}; path=/; max-age=${thirtyDays}`;
    location.reload();
  };

  return (
    <select
      aria-label="Dev locale switcher"
      className="fixed bottom-2 right-2 z-50 rounded border border-current bg-[var(--color-bg)] px-2 py-1 text-xs text-[var(--color-text)]"
      defaultValue=""
      onChange={(e) => onChange(e.target.value)}
    >
      <option disabled value="">
        Locale
      </option>
      {SUPPORTED_LOCALES.map((locale) => (
        <option key={locale} value={locale}>
          {locale}
        </option>
      ))}
    </select>
  );
}
