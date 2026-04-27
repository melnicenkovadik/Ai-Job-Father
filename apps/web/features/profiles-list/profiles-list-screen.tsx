'use client';

import { Icon } from '@/components/icons';
import { useTelegramBackButton } from '@/components/telegram/use-back-button';
import { Headline, MainButtonBinding } from '@/components/ui';
import { Screen, Scroll, Stack } from '@/components/ui/layout';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { type ProfileSummaryDto, useProfilesQuery } from './use-profiles';

export function ProfilesListScreen() {
  const t = useTranslations('screens.profiles');
  const router = useRouter();
  const { data: list = [], isLoading } = useProfilesQuery();

  useTelegramBackButton('/');

  return (
    <Screen>
      <Scroll className="flex-1">
        <Stack gap={3} className="px-4 pb-4 pt-6">
          <Stack gap={1}>
            <Headline size="md">{t('title')}</Headline>
            <p className="text-[13px] text-[var(--color-text-dim)]">{t('subtitle')}</p>
          </Stack>

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

      <MainButtonBinding text={t('newProfile')} onClick={() => router.push('/profile/upload')} />
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
  const display = profile.fullName ?? profile.name;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex w-full min-w-0 flex-col rounded-[var(--radius-lg)] border bg-[var(--color-surface)] p-4 text-left transition-colors ${
        profile.isDefault
          ? 'border-[var(--color-accent)]'
          : 'border-[var(--color-border)] hover:bg-[var(--color-surface-hi)]'
      }`}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-bg)] text-[14px] font-bold text-[var(--color-accent)]">
          {display.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="min-w-0 truncate text-[15px] font-semibold text-[var(--color-text)]">
              {display}
            </span>
            {profile.isDefault ? (
              <span className="shrink-0 rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-accent-ink)]">
                {defaultLabel}
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
  );
}
