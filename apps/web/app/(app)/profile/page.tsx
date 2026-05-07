'use client';

import { useTelegramBackButton } from '@/components/telegram/use-back-button';
import { Screen, Scroll, Section, Stack } from '@/components/ui/layout';
import { EducationSection } from '@/features/profile/education-section';
import { ExperienceSection } from '@/features/profile/experience-section';
import { IdentitySection } from '@/features/profile/identity-section';
import { LanguagesSection } from '@/features/profile/languages-section';
import { LinksSection } from '@/features/profile/links-section';
import { ReparseWithAiButton } from '@/features/profile/reparse-ai-button';
import { SaveProfileButton } from '@/features/profile/save-profile-button';
import { SkillsSection } from '@/features/profile/skills-section';
import {
  EMPTY_DRAFT,
  type ProfileDraft,
  type ResumeMeta,
  applyResumeMeta,
  draftToWire,
  mergeParsedResume,
} from '@/features/profile/types';
import { UploadCvButton } from '@/features/profile/upload-cv-button';
import { useProfileDraft } from '@/features/profile/use-profile-draft';
import { authedFetch } from '@/lib/http/authed-fetch';
import type { ProfileDto } from '@/lib/profile/schema';
import type { ParsedResume } from '@ai-job-bot/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const PROFILE_QUERY_KEY = ['profile', 'me'] as const;

class SaveError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly body: { error?: string; issues?: { path: string; message: string }[] },
  ) {
    super(`save_${status}_${code}`);
    this.name = 'SaveError';
  }
}

/** Distill a short, user-readable name from the parsed resume so the
 *  multi-profile list doesn't end up with three "Default profile" rows.
 *  Prefers the headline (truncated), falls back to fullName + suffix. */
function autoNameFromParsed(parsed: ParsedResume): string | undefined {
  const headline = parsed.headline?.trim();
  if (headline && headline.length > 0) {
    return headline.length > 40 ? `${headline.slice(0, 39)}…` : headline;
  }
  const fullName = parsed.fullName?.trim();
  if (fullName && fullName.length > 0) {
    return fullName.length > 36 ? `${fullName.slice(0, 35)}…` : fullName;
  }
  return undefined;
}

function formatSaveError(err: SaveError): string {
  const lines: string[] = [`HTTP ${err.status} · ${err.code}`];
  if (err.body.issues && err.body.issues.length > 0) {
    for (const issue of err.body.issues.slice(0, 10)) {
      lines.push(`  ${issue.path}: ${issue.message}`);
    }
    if (err.body.issues.length > 10) {
      lines.push(`  … and ${err.body.issues.length - 10} more`);
    }
  }
  return lines.join('\n');
}

export default function ProfilePage() {
  const t = useTranslations('profile');
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [saveBanner, setSaveBanner] = useState<'success' | 'error' | null>(null);
  useTelegramBackButton('/');

  // "New profile" mode: came in from /profile/upload, want a blank form
  // hydrated from the just-parsed resume — NOT the user's existing default.
  const isNewMode = searchParams?.get('new') === '1';

  const query = useQuery<ProfileDto | null>({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: async () => {
      const res = await authedFetch('/api/profile');
      if (!res.ok) throw new Error(`profile_fetch_${res.status}`);
      return (await res.json()) as ProfileDto | null;
    },
    enabled: !isNewMode,
  });

  // In new-mode, treat the draft as null (start blank). Outside new-mode, use
  // the fetched default profile.
  const draftState = useProfileDraft(isNewMode ? null : (query.data ?? null));

  // Reset form when the initial profile loads after first paint. Skipped in
  // new-mode — the form should stay blank until we hydrate from sessionStorage.
  // biome-ignore lint/correctness/useExhaustiveDependencies: draftState.reset is stable but intentionally not in the dep list.
  useEffect(() => {
    if (isNewMode) return;
    if (query.data !== undefined) {
      draftState.reset(query.data);
    }
  }, [query.data, isNewMode]);

  // Hydrate new-mode form from sessionStorage on mount. The /profile/upload
  // screen stashes the parsed JSON + raw PDF there before navigating here.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!isNewMode || hydratedRef.current) return;
    hydratedRef.current = true;
    try {
      const raw = sessionStorage.getItem('pendingParsedResume');
      if (!raw) return;
      const parsed = JSON.parse(raw) as ParsedResume;
      const merged = mergeParsedResume(EMPTY_DRAFT, parsed);
      // Pull resume provenance metadata stashed alongside the parsed JSON.
      // Optional — older uploads (pre-J.3) won't have it.
      let withMeta = merged;
      try {
        const metaRaw = sessionStorage.getItem('pendingResumeMeta');
        if (metaRaw) {
          const meta = JSON.parse(metaRaw) as ResumeMeta;
          withMeta = applyResumeMeta(merged, meta);
        }
      } catch {
        // Bad meta JSON — keep going without provenance.
      }
      // Auto-name the profile from the parsed headline so users with
      // multiple profiles can tell them apart at a glance. The default
      // "Default profile" string is unhelpful when you have three.
      const autoName = autoNameFromParsed(parsed);
      draftState.replace(autoName ? { ...withMeta, name: autoName } : withMeta);
    } catch {
      // Bad JSON or storage unavailable — leave the form blank.
    }
  }, [isNewMode, draftState]);

  const [saveErrorDetail, setSaveErrorDetail] = useState<string | null>(null);
  const saveMutation = useMutation<ProfileDto, SaveError, ProfileDraft>({
    mutationFn: async (draft) => {
      const existing = isNewMode ? null : (query.data ?? null);
      const isNew = !existing;
      // The server decides isDefault on POST: first profile → default,
      // subsequent → alternate. Keep the client out of that policy.
      const body = draftToWire(draft);
      const url = isNew ? '/api/profile' : `/api/profile/${existing.id}`;
      const method = isNew ? 'POST' : 'PUT';
      const res = await authedFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as {
          error?: string;
          issues?: { path: string; message: string }[];
          message?: string;
        };
        throw new SaveError(res.status, errBody.error ?? 'internal', errBody);
      }
      return (await res.json()) as ProfileDto;
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY, saved);
      // The server flips settings.hasOnboarded on POST/PUT. Invalidate the
      // settings query so the home page picks up the change before redirect —
      // otherwise the stale cached value sends the user back to /onboarding.
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['profiles', 'list'] });
      draftState.reset(saved);
      setSaveBanner('success');
      setSaveErrorDetail(null);
      // Drop the pending blob/parse — they served their purpose.
      try {
        sessionStorage.removeItem('pendingParsedResume');
        sessionStorage.removeItem('pendingResumeMeta');
        sessionStorage.removeItem('pendingResumeBlob');
        sessionStorage.removeItem('pendingResumeName');
      } catch {
        // ignore
      }
      // Land on the profile list after creating a new one (so the user sees
      // their new profile alongside the existing default), home otherwise.
      const next = isNewMode ? '/profiles' : '/';
      setTimeout(() => router.push(next), 1500);
    },
    onError: (err) => {
      setSaveBanner('error');
      setSaveErrorDetail(formatSaveError(err));
    },
  });

  useEffect(() => {
    if (!saveBanner) return;
    const timer = setTimeout(() => setSaveBanner(null), 3500);
    return () => clearTimeout(timer);
  }, [saveBanner]);

  function handleParsed(parsed: ParsedResume, meta: ResumeMeta) {
    const merged = mergeParsedResume(draftState.draft, parsed);
    draftState.replace(applyResumeMeta(merged, meta));
  }

  // In edit mode wait for the GET. In new mode there's no fetch — render
  // straight away so the freshly hydrated draft is visible.
  if (!isNewMode && query.isLoading) {
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
          {/* Inline "Upload CV" button only on edit mode — re-import from a
              new PDF replaces the form. In new-mode the form was just
              hydrated from the upload screen; showing the button there is
              the duplicate-upload UX bug we're killing. */}
          {!isNewMode && (
            <Section>
              <UploadCvButton onParsed={handleParsed} />
            </Section>
          )}

          {/* AI re-parse without re-upload — only when an existing profile has
              a stored PDF in Supabase Storage. The button gates behind a
              Stars invoice; on success the form is re-hydrated with the new
              parse. New-mode skips this (the user just parsed). */}
          {!isNewMode && query.data?.id && query.data?.resumeStoragePath ? (
            <Section>
              <ReparseWithAiButton profileId={query.data.id} onParsed={handleParsed} />
            </Section>
          ) : null}

          {saveBanner === 'success' && (
            <Section>
              <p className="rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-300">
                ✓ {t('save.success')}
              </p>
            </Section>
          )}
          {saveBanner === 'error' && (
            <Section>
              <div className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                <p>{t('save.error')}</p>
                {saveErrorDetail && (
                  <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-[11px] opacity-80">
                    {saveErrorDetail}
                  </pre>
                )}
              </div>
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
        loading={saveMutation.isPending}
        onClick={() => saveMutation.mutate(draftState.draft)}
      />
    </Screen>
  );
}
