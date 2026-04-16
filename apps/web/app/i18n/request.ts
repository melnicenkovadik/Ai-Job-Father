import { detectLocale, SUPPORTED_LOCALES, type Locale } from '@ai-job-bot/core';
import { cookies, headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';

/**
 * Locale priority (first match wins):
 *   1. explicit `locale` cookie (Phase 5 settings or dev LocaleSwitcher)
 *   2. Accept-Language header (auto-detected primary tag)
 *   3. fallback 'en'
 *
 * Later phases will also resolve from DB (authenticated session) — wired in
 * Phase 5 once the auth layer exposes user locale via request context.
 */
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();

  const cookieLocale = cookieStore.get('locale')?.value;
  const headerLocale = headerStore.get('accept-language')?.split(',')[0];

  const resolved: Locale =
    cookieLocale && (SUPPORTED_LOCALES as readonly string[]).includes(cookieLocale)
      ? (cookieLocale as Locale)
      : detectLocale(headerLocale ?? undefined);

  const messages = (await import(`../../messages/${resolved}.json`)).default;
  return { locale: resolved, messages };
});
