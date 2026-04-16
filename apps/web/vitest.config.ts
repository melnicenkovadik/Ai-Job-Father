import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
      '@ai-job-bot/core': fileURLToPath(new URL('../../packages/core/src/index.ts', import.meta.url)),
      '@ai-job-bot/db': fileURLToPath(new URL('../../packages/db/types/generated.ts', import.meta.url)),
      // `server-only` throws on import from any non-RSC context. Stub it for unit tests.
      'server-only': fileURLToPath(new URL('./test/stubs/server-only.ts', import.meta.url)),
    },
  },
  test: {
    include: ['lib/**/*.test.ts', 'components/**/*.test.{ts,tsx}', 'features/**/*.test.{ts,tsx}'],
    environment: 'node',
    setupFiles: [],
  },
});
