'use client';

import { Icon } from '@/components/icons';
import { useTelegramBackButton } from '@/components/telegram/use-back-button';
import { BottomTabBar, Headline, Spinner } from '@/components/ui';
import { Screen, Scroll, Stack } from '@/components/ui/layout';
import { profileTint } from '@/lib/profile/tint';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { type ProfileSummaryDto, useDeleteProfile, useProfilesQuery } from './use-profiles';

export function ProfilesListScreen() {
  const t = useTranslations('screens.profiles');
  const router = useRouter();
  const { data: list = [], isLoading } = useProfilesQuery();

  useTelegramBackButton('/');

  return (
    <Screen reserveMainButton={false} className="pb-[5.5rem]">
      <Scroll className="flex-1">
        <Stack gap={3} className="px-4 pb-4 pt-6">
          <Stack gap={1}>
            <div className="flex min-w-0 items-start justify-between gap-3">
              <Headline size="md">{t('title')}</Headline>
              <button
                type="button"
                onClick={() => router.push('/profile/upload')}
                className="inline-flex min-h-[2.25rem] shrink-0 items-center gap-1.5 rounded-[var(--radius-full)] bg-[var(--color-accent)] px-3 py-1.5 text-[13px] font-semibold text-[var(--color-accent-ink)] transition-opacity hover:opacity-90"
              >
                <Icon.Plus size={14} />
                <span>{t('newProfile')}</span>
              </button>
            </div>
            <p className="text-[13px] text-[var(--color-text-dim)]">{t('subtitle')}</p>
          </Stack>

          {isLoading ? (
            <Stack gap={2} className="items-center px-6 py-10 text-center">
              <Spinner size={20} />
              <p className="text-[13px] text-[var(--color-text-dim)]">{t('loading')}</p>
            </Stack>
          ) : null}
          {!isLoading && list.length === 0 ? (
            <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] px-3 py-6 text-center text-[13px] text-[var(--color-text-mute)]">
              {t('empty')}
            </p>
          ) : null}
          {list.length > 0 ? (
            <Stack gap={2}>
              {list.map((p) => (
                <ProfileCard
                  key={p.id}
                  profile={p}
                  defaultLabel={t('default')}
                  campaignsLabel={t('campaigns', { count: p.campaignCount })}
                  editLabel={t('edit')}
                  onOpen={() => router.push('/profile')}
                />
              ))}
            </Stack>
          ) : null}
        </Stack>
      </Scroll>

      <BottomTabBar />
    </Screen>
  );
}

interface ProfileCardProps {
  profile: ProfileSummaryDto;
  defaultLabel: string;
  campaignsLabel: string;
  editLabel: string;
  onOpen: () => void;
}

function ProfileCard({
  profile,
  defaultLabel,
  campaignsLabel,
  editLabel,
  onOpen,
}: ProfileCardProps) {
  const t = useTranslations('screens.profiles.delete');
  const display = profile.fullName ?? profile.name;
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Two-stage delete: 1st click — plain delete (server enforces FK and
  // returns 409 if campaigns reference the profile). 2nd click after the
  // 409 — pass `force` so the backend cascades through payments and
  // campaigns first. We also track the campaign count surfaced by the
  // 409 body so the UI can warn "X campaigns will be removed".
  const [cascadeAck, setCascadeAck] = useState(false);
  const [blockedCount, setBlockedCount] = useState<number | null>(null);
  const deleteMutation = useDeleteProfile();

  if (confirming) {
    const primaryLabel = deleteMutation.isPending
      ? '…'
      : cascadeAck
        ? t('confirmCascade')
        : t('confirmYes');
    const hint = cascadeAck ? t('cascadeHint', { count: blockedCount ?? 0 }) : t('confirmHint');
    return (
      <div className="flex w-full min-w-0 flex-col rounded-[var(--radius-lg)] border border-[var(--color-danger)] bg-[var(--color-surface)] p-4">
        <p className="text-[14px] font-semibold text-[var(--color-text)]">
          {t('confirmTitle', { name: display })}
        </p>
        <p className="mt-1 text-[12px] text-[var(--color-text-dim)]">{hint}</p>
        {error ? (
          <p
            role="alert"
            className="mt-2 rounded-[var(--radius-md)] bg-[var(--color-danger)]/10 px-3 py-2 text-[12px] text-[var(--color-danger)]"
          >
            {error}
          </p>
        ) : null}
        <div className="mt-3 flex min-w-0 items-center gap-2">
          <button
            type="button"
            disabled={deleteMutation.isPending}
            onClick={() => {
              setError(null);
              deleteMutation.mutate(
                { id: profile.id, force: cascadeAck },
                {
                  onSuccess: () => {
                    setConfirming(false);
                    setCascadeAck(false);
                    setBlockedCount(null);
                  },
                  onError: (err) => {
                    if (err.code === 'has_campaigns') {
                      // Move into "cascade ack" mode — the next click
                      // will retry with force=1.
                      setCascadeAck(true);
                      setBlockedCount(err.campaignCount ?? null);
                      setError(null);
                    } else if (err.code === 'forbidden' || err.code === 'not_found') {
                      setError(t('errorNotFound'));
                    } else if (err.code === 'cascade_failed') {
                      setError(t('errorCascadeFailed'));
                    } else {
                      setError(t('errorGeneric'));
                    }
                  },
                },
              );
            }}
            className="inline-flex min-h-[2.5rem] flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-danger)] px-3 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {primaryLabel}
          </button>
          <button
            type="button"
            disabled={deleteMutation.isPending}
            onClick={() => {
              setConfirming(false);
              setError(null);
              setCascadeAck(false);
              setBlockedCount(null);
            }}
            className="inline-flex min-h-[2.5rem] flex-1 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-[13px] font-medium text-[var(--color-text)] disabled:opacity-50"
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    );
  }

  // Per-profile tint — derived from `profile.name`. Two profiles parsed
  // from the same CV can share fullName + headline; the name pill ("WITH
  // AI", "WITHout AI") plus the tint colour are what tells them apart.
  const tint = profileTint(profile.name);
  // Show the profile.name as a small pill whenever it's actually
  // distinguishing — i.e. it's set AND it differs from the display
  // headline. Falls quiet when name == display (the default
  // "Profile" / "Vadym Melnychenko" case) so we don't double-print.
  const showNamePill = Boolean(profile.name?.trim()) && profile.name !== display;

  return (
    <div
      className={`relative flex w-full min-w-0 flex-col rounded-[var(--radius-lg)] border bg-[var(--color-surface)] p-4 transition-colors ${
        profile.isDefault
          ? 'border-[var(--color-accent)]'
          : 'border-[var(--color-border)] hover:bg-[var(--color-surface-hi)]'
      }`}
      style={{
        // The left rail is the strong tint signal; a soft outer glow
        // gives the card a halo so it pops in a long list without
        // shouting.
        borderLeft: `3px solid ${tint.border}`,
        boxShadow: `0 0 0 1px ${tint.glow}`,
      }}
    >
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={t('label')}
        className="absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-full text-[var(--color-text-mute)] transition-colors hover:bg-[var(--color-bg-2)] hover:text-[var(--color-danger)]"
      >
        <Icon.Trash size={16} />
      </button>
      <button type="button" onClick={onOpen} className="flex w-full min-w-0 flex-col text-left">
        <div className="flex min-w-0 items-start gap-2.5 pr-8">
          <span
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-[14px] font-bold"
            style={{ backgroundColor: tint.pill, color: tint.pillText }}
          >
            {display.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <span className="min-w-0 truncate text-[15px] font-semibold text-[var(--color-text)]">
                {display}
              </span>
              {profile.isDefault ? (
                <span className="shrink-0 rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-accent-ink)]">
                  {defaultLabel}
                </span>
              ) : null}
              {showNamePill ? (
                <span
                  className="min-w-0 max-w-full shrink-0 truncate rounded-[var(--radius-sm)] px-1.5 py-0.5 text-[10px] font-semibold"
                  style={{ backgroundColor: tint.pill, color: tint.pillText }}
                >
                  {profile.name}
                </span>
              ) : null}
            </div>
            {profile.headline ? (
              <p className="mt-0.5 truncate text-[13px] text-[var(--color-text-dim)]">
                {profile.headline}
              </p>
            ) : null}
          </div>
        </div>
        <div className="mt-3 flex min-w-0 items-center justify-between border-t border-[var(--color-border)] pt-2 text-[12px] text-[var(--color-text-mute)]">
          <span>{campaignsLabel}</span>
          <span className="flex min-w-0 items-center gap-1 font-semibold text-[var(--color-accent)]">
            {editLabel}
            <Icon.ChevronRight size={12} />
          </span>
        </div>
      </button>
    </div>
  );
}
