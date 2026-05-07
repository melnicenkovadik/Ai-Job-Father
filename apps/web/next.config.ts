import { withSentryConfig } from '@sentry/nextjs';
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

const intlConfig = withNextIntl(nextConfig);

/**
 * Sentry source-map upload only runs when `SENTRY_AUTH_TOKEN` is set
 * (production). Without it the wrapper is a no-op — preview/dev builds
 * never block on Sentry's CLI.
 */
export default withSentryConfig(intlConfig, {
  // Repo-level org/project. Leave empty here — `sentry-cli` reads them
  // from env (`SENTRY_ORG`, `SENTRY_PROJECT`) when uploading.
  silent: true,
  // Source-map upload is gated by `SENTRY_AUTH_TOKEN` in env —
  // preview/dev builds skip it cleanly without manual flags.
  widenClientFileUpload: true,
  tunnelRoute: '/monitoring',
});
