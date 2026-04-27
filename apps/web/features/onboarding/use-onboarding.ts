'use client';

import { authedFetch } from '@/lib/http/authed-fetch';
import { getBrowserLogger } from '@/lib/logger';
import { useMutation, useQueryClient } from '@tanstack/react-query';

async function postComplete(): Promise<{ hasOnboarded: boolean }> {
  const res = await authedFetch('/api/onboarding/complete', { method: 'POST' });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `onboarding_failed_${res.status}`);
  }
  return (await res.json()) as { hasOnboarded: boolean };
}

export function useCompleteOnboarding() {
  const qc = useQueryClient();
  return useMutation<{ hasOnboarded: boolean }, Error, void>({
    mutationFn: postComplete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (err) => {
      getBrowserLogger().error({
        context: 'features/onboarding.complete',
        message: err.message,
        error: err,
      });
    },
  });
}
