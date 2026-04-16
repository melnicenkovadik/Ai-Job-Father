'use client';

import type { SessionResponse } from '@/components/telegram/auth-gate';
import { useQueryClient } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

/**
 * Read-only view of the `['session']` query cache entry populated by the
 * `<AuthGate>` mutation. Consumers are components rendered inside `<AuthGate>`,
 * so the payload is always present by the time they render.
 */
export function useSession(): SessionResponse | undefined {
  const queryClient = useQueryClient();
  return useSyncExternalStore(
    (onChange) => queryClient.getQueryCache().subscribe(onChange),
    () => queryClient.getQueryData<SessionResponse>(['session']),
    () => undefined,
  );
}
