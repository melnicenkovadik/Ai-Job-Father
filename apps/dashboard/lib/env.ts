import 'server-only';
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    SUPABASE_URL: z.string().url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
    DASHBOARD_USER: z.string().min(1),
    DASHBOARD_PASSWORD: z.string().min(8),
    TELEGRAM_BOT_TOKEN: z.string().optional(),
    TON_NETWORK: z.enum(['mainnet', 'testnet']).default('mainnet'),
    STARS_TEST_MODE: z.string().optional(),
    STARS_TEST_AMOUNT: z.coerce.number().int().min(1).optional(),
  },
  client: {},
  runtimeEnv: {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    DASHBOARD_USER: process.env.DASHBOARD_USER,
    DASHBOARD_PASSWORD: process.env.DASHBOARD_PASSWORD,
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    TON_NETWORK: process.env.TON_NETWORK,
    STARS_TEST_MODE: process.env.STARS_TEST_MODE,
    STARS_TEST_AMOUNT: process.env.STARS_TEST_AMOUNT,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
