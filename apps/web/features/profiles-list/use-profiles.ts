'use client';

import { authedFetch } from '@/lib/http/authed-fetch';
import { useQuery } from '@tanstack/react-query';

export interface ProfileSummaryDto {
  id: string;
  userId: string;
  name: string;
  isDefault: boolean;
  headline: string | null;
  fullName: string | null;
  preferredCategories: readonly string[];
  campaignCount: number;
}

interface RawProfile {
  id: string;
  userId: string;
  name: string;
  isDefault: boolean;
  headline: string | null;
  fullName: string | null;
  preferredCategories: readonly string[];
}

interface RawListItem {
  profile: RawProfile;
  campaignCount: number;
}

async function fetchProfiles(): Promise<ProfileSummaryDto[]> {
  const res = await authedFetch('/api/profile/list');
  if (!res.ok) throw new Error(`profiles_list_failed_${res.status}`);
  const body = (await res.json()) as { profiles: RawListItem[] };
  return body.profiles.map((item) => ({
    id: item.profile.id,
    userId: item.profile.userId,
    name: item.profile.name,
    isDefault: item.profile.isDefault,
    headline: item.profile.headline,
    fullName: item.profile.fullName,
    preferredCategories: item.profile.preferredCategories,
    campaignCount: item.campaignCount,
  }));
}

export function useProfilesQuery() {
  return useQuery<ProfileSummaryDto[], Error>({
    queryKey: ['profiles'],
    queryFn: fetchProfiles,
    staleTime: 30_000,
  });
}
