export const runtime = 'nodejs';
export const dynamic = 'force-static';

import { env } from '@/lib/env';

/**
 * TonConnect manifest. Tonkeeper / TON Space / Wallet read this on the
 * "Connect" screen to show the dApp's name + icon to the user. URL is
 * `https://<host>/.well-known/tonconnect-manifest.json` and must be served
 * with `application/json` from a stable HTTPS origin.
 *
 * NEXT_PUBLIC_MINI_APP_URL falls back to a vercel.app alias when unset; this
 * keeps preview deployments self-consistent.
 */
export function GET(): Response {
  const url = (env.NEXT_PUBLIC_MINI_APP_URL ?? 'https://ai-job-bot-web.vercel.app').replace(
    /\/+$/,
    '',
  );
  return Response.json(
    {
      url,
      name: 'AI Job Bot',
      iconUrl: `${url}/icon.png`,
    },
    { headers: { 'cache-control': 'public, max-age=300' } },
  );
}
