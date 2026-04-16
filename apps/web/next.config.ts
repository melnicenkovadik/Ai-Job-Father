import type { NextConfig } from 'next';

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

export default nextConfig;
