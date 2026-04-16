import { TelegramProvider } from '@/components/telegram/provider';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import type { ReactNode } from 'react';
import '../globals.css';

/**
 * Mini App route group layout. Runs server-side to hydrate translations,
 * then delegates Telegram-specific wiring (SDK, theme, auth) to the
 * `<TelegramProvider>` client boundary.
 *
 * Root `<html>` + `<body>` live in `app/layout.tsx` — this layout only adds
 * providers to the tree below them.
 */
export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}): Promise<ReactNode> {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <TelegramProvider>{children}</TelegramProvider>
    </NextIntlClientProvider>
  );
}
