'use client';

import { authedFetch } from '@/lib/http/authed-fetch';
import type { ProfileDto } from '@/lib/profile/schema';
import { useQuery } from '@tanstack/react-query';

export const PROFILE_QUERY_KEY = ['profile', 'me'] as const;

async function fetchProfile(): Promise<ProfileDto | null> {
  const res = await authedFetch('/api/profile');
  if (!res.ok) throw new Error(`profile_fetch_${res.status}`);
  return (await res.json()) as ProfileDto | null;
}

/**
 * Default profile loader. Shared between the profile editor (which seeds
 * the form) and the wizard (which pulls skills/languages to pre-fill the
 * stack/language steps).
 */
export function useProfileQuery() {
  return useQuery<ProfileDto | null>({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: fetchProfile,
    staleTime: 30_000,
  });
}
