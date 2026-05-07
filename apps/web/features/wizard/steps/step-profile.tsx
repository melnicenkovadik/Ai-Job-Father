'use client';

import { Icon } from '@/components/icons';
import { Spinner } from '@/components/ui';
import { Stack } from '@/components/ui/layout';
import { type ProfileSummaryDto, useProfilesQuery } from '@/features/profiles-list/use-profiles';
import { useWizardDraft } from '@/features/wizard/draft-store';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

/**
 * Wizard step 0 (when shown). Lets the user pick which profile this campaign
 * uses. Shown only when the user has 2+ profiles — wizard-screen filters the
 * step out otherwise so single-profile users go straight to category.
 *
 * The profile drives the campaign snapshot frozen at Pay click — picking the
 * wrong one sends out applications with the wrong CV.
 */
export function StepProfile() {
  const t = useTranslations('screens.wizard.profile');
  const router = useRouter();
  const { data: profiles = [], isLoading } = useProfilesQuery();
  const draft = useWizardDraft((s) => s.draft);
  const patchDraft = useWizardDraft((s) => s.patchDraft);

  const choose = (id: string) => patchDraft({ profileId: id });

  if (isLoading) {
    return (
      <Stack gap={2} className="items-center px-6 py-10">
        <Spinner size={20} />
        <p className="text-[13px] text-[var(--color-text-dim)]">{t('loading')}</p>
      </Stack>
    );
  }

  return (
    <Stack gap={2}>
      {profiles.map((p) => (
        <ProfileCard
          key={p.id}
          profile={p}
          selected={draft.profileId === p.id}
          onSelect={() => choose(p.id)}
          defaultLabel={t('defaultBadge')}
        />
      ))}
      <button
        type="button"
        onClick={() => router.push('/profile/upload')}
        className="flex min-h-[2.75rem] w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] bg-transparent px-3 py-2 text-[13px] font-medium text-[var(--color-text-dim)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
      >
        <Icon.Plus size={14} />
        <span>{t('newProfile')}</span>
      </button>
    </Stack>
  );
}

function ProfileCard({
  profile,
  selected,
  onSelect,
  defaultLabel,
}: {
  profile: ProfileSummaryDto;
  selected: boolean;
  onSelect: () => void;
  defaultLabel: string;
}) {
  const display = profile.fullName ?? profile.name;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex w-full min-w-0 items-start gap-3 rounded-[var(--radius-lg)] border p-3.5 text-left transition-colors ${
        selected
          ? 'border-[var(--color-accent)] bg-[var(--color-accent-bg)]'
          : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hi)]'
      }`}
    >
      <span
        className={`mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
          selected
            ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-ink)]'
            : 'border-[var(--color-border-hi)]'
        }`}
      >
        {selected ? <Icon.Check size={12} strokeWidth={3} /> : null}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[14px] font-semibold text-[var(--color-text)]">
            {display}
          </span>
          {profile.isDefault ? (
            <span className="shrink-0 rounded-full bg-[var(--color-accent-bg)] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--color-accent)]">
              {defaultLabel}
            </span>
          ) : null}
        </div>
        {profile.headline ? (
          <p className="mt-0.5 truncate text-[12px] text-[var(--color-text-dim)]">
            {profile.headline}
          </p>
        ) : null}
        {profile.name !== display ? (
          <p className="mt-0.5 truncate text-[11px] text-[var(--color-text-mute)]">
            {profile.name}
          </p>
        ) : null}
      </div>
    </button>
  );
}
