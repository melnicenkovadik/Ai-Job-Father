import { ThemeBridge } from '@/components/telegram/theme-bridge';
import { MockStoreProvider } from '@/lib/mocks/hydrate';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import type { ReactNode } from 'react';

/**
 * Dev mirror layout — gives /(dev)/screens/* the same providers as /(app)
 * (i18n + mock store) but skips Telegram auth and bot wiring so the screens
 * can be reviewed straight from the browser. Locale defaults to RU because
 * the design copy is RU-first.
 */
export default async function DevScreensLayout({ children }: { children: ReactNode }) {
  const messages = await getMessages({ locale: 'ru' });
  return (
    <NextIntlClientProvider locale="ru" messages={messages}>
      <ThemeBridge />
      <MockStoreProvider>{children}</MockStoreProvider>
    </NextIntlClientProvider>
  );
}
