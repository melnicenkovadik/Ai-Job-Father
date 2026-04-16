import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./app/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // grammY requires Node runtime on the bot webhook (Phase 1+).
  // RSC/edge defaults are fine for pages; route handlers opt in via `export const runtime = 'nodejs'`.
  experimental: {
    typedEnv: true,
  },
  transpilePackages: ['@ai-job-bot/core', '@ai-job-bot/db'],
};

export default withNextIntl(nextConfig);
