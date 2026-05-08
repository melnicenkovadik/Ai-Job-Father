'use client';

import { authedFetch } from '@/lib/http/authed-fetch';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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

export class DeleteProfileError extends Error {
  constructor(
    public readonly code: string,
    public readonly campaignCount?: number,
  ) {
    super(code);
    this.name = 'DeleteProfileError';
  }
}

interface DeleteProfileInput {
  readonly id: string;
  readonly force?: boolean;
}

async function deleteProfileApi({ id, force = false }: DeleteProfileInput): Promise<void> {
  const url = force ? `/api/profile/${id}?force=1` : `/api/profile/${id}`;
  const res = await authedFetch(url, { method: 'DELETE' });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      campaignCount?: number;
    };
    throw new DeleteProfileError(
      body.error ?? `delete_${res.status}`,
      typeof body.campaignCount === 'number' ? body.campaignCount : undefined,
    );
  }
}

/**
 * On success, invalidates the profile list, the single-profile query, and
 * the campaign list (`campaigns.profile_id` FK + the cascade path both
 * touch the same cache).
 *
 * Two-stage delete: call without `force` first; on `has_campaigns` the
 * UI shows a second confirm and re-runs the mutation with `force: true`,
 * which cascades through payments → campaigns → profile.
 */
export function useDeleteProfile() {
  const qc = useQueryClient();
  return useMutation<void, DeleteProfileError, DeleteProfileInput>({
    mutationFn: deleteProfileApi,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profiles'] });
      qc.invalidateQueries({ queryKey: ['profile', 'me'] });
      qc.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}
