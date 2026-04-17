'use client';

import { Screen, Scroll, Section, Stack } from '@/components/ui/layout';
import { EducationSection } from '@/features/profile/education-section';
import { ExperienceSection } from '@/features/profile/experience-section';
import { IdentitySection } from '@/features/profile/identity-section';
import { LanguagesSection } from '@/features/profile/languages-section';
import { LinksSection } from '@/features/profile/links-section';
import { SaveProfileButton } from '@/features/profile/save-profile-button';
import { SkillsSection } from '@/features/profile/skills-section';
import { type ProfileDraft, draftToWire, mergeParsedResume } from '@/features/profile/types';
import { UploadCvButton } from '@/features/profile/upload-cv-button';
import { useProfileDraft } from '@/features/profile/use-profile-draft';
import { authedFetch } from '@/lib/http/authed-fetch';
import type { ProfileDto } from '@/lib/profile/schema';
import type { ParsedResume } from '@ai-job-bot/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

const PROFILE_QUERY_KEY = ['profile', 'me'] as const;

export default function ProfilePage() {
  const t = useTranslations('profile');
  const queryClient = useQueryClient();
  const [saveBanner, setSaveBanner] = useState<'success' | 'error' | null>(null);

  const query = useQuery<ProfileDto | null>({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: async () => {
      const res = await authedFetch('/api/profile');
      if (!res.ok) throw new Error(`profile_fetch_${res.status}`);
      return (await res.json()) as ProfileDto | null;
    },
  });

  const draftState = useProfileDraft(query.data ?? null);

  // Reset form when the initial profile loads after first paint. We deliberately
  // depend only on the server payload — not the local draft — so typing into a
  // field never re-seeds from the snapshot.
  // biome-ignore lint/correctness/useExhaustiveDependencies: draftState.reset is stable but intentionally not in the dep list.
  useEffect(() => {
    if (query.data !== undefined) {
      draftState.reset(query.data);
    }
  }, [query.data]);

  const saveMutation = useMutation<ProfileDto, Error, ProfileDraft>({
    mutationFn: async (draft) => {
      const body = draftToWire(draft);
      const existing = query.data;
      const isNew = !existing;
      const url = isNew ? '/api/profile' : `/api/profile/${existing.id}`;
      const method = isNew ? 'POST' : 'PUT';
      const res = await authedFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(`save_${res.status}`);
      }
      return (await res.json()) as ProfileDto;
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY, saved);
      draftState.reset(saved);
      setSaveBanner('success');
    },
    onError: () => setSaveBanner('error'),
  });

  useEffect(() => {
    if (!saveBanner) return;
    const timer = setTimeout(() => setSaveBanner(null), 3500);
    return () => clearTimeout(timer);
  }, [saveBanner]);

  function handleParsed(parsed: ParsedResume) {
    draftState.replace(mergeParsedResume(draftState.draft, parsed));
  }

  if (query.isLoading) {
    return (
      <Screen>
        <Stack gap={2} className="flex-1 items-center justify-center px-6 py-12 text-center">
          <p className="text-sm opacity-70">{t('loading')}</p>
        </Stack>
      </Screen>
    );
  }

  const nameError =
    draftState.draft.name.trim().length === 0 ? t('validation.nameRequired') : undefined;

  return (
    <Screen>
      <Scroll>
        <Stack gap={3} className="py-3">
          <Section>
            <UploadCvButton onParsed={handleParsed} />
          </Section>

          {saveBanner === 'success' && (
            <Section>
              <p className="rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-300">
                ✓ {t('save.success')}
              </p>
            </Section>
          )}
          {saveBanner === 'error' && (
            <Section>
              <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                {t('save.error')}
              </p>
            </Section>
          )}

          <IdentitySection
            draft={draftState.draft}
            patch={draftState.patch}
            {...(nameError !== undefined ? { nameError } : {})}
          />
          <ExperienceSection draft={draftState.draft} patch={draftState.patch} />
          <EducationSection draft={draftState.draft} patch={draftState.patch} />
          <SkillsSection draft={draftState.draft} patch={draftState.patch} />
          <LanguagesSection draft={draftState.draft} patch={draftState.patch} />
          <LinksSection draft={draftState.draft} patch={draftState.patch} />
        </Stack>
      </Scroll>

      <SaveProfileButton
        text={saveMutation.isPending ? t('actions.saving') : t('actions.save')}
        disabled={!draftState.isDirty || !draftState.isValid || saveMutation.isPending}
        onClick={() => saveMutation.mutate(draftState.draft)}
      />
    </Screen>
  );
}
