import type { Metadata } from 'next';
import Script from 'next/script';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Job Bot',
  description: 'Telegram Mini App for AI-assisted job search',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/*
         * Telegram Mini App runtime. Must load before any client code that reads
         * `window.Telegram.WebApp.*` — otherwise initData is undefined and the
         * AuthGate renders its "open from Telegram" error state. `beforeInteractive`
         * guarantees execution before React hydration.
         */}
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      </head>
      <body>{children}</body>
    </html>
  );
}
