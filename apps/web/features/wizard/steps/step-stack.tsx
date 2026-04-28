'use client';

import { Icon } from '@/components/icons';
import { SectionTitle } from '@/components/ui';
import { Stack } from '@/components/ui/layout';
import { useProfileQuery } from '@/features/profile/use-profile';
import { suggestStack } from '@/features/wizard/data/category-stack';
import { useWizardDraft } from '@/features/wizard/draft-store';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

export function StepStack() {
  const t = useTranslations('screens.wizard.stack');
  const { stack, category, patchDraft } = useWizardDraft((s) => ({
    stack: s.draft.stack,
    category: s.draft.category,
    patchDraft: s.patchDraft,
  }));
  const { data: profile } = useProfileQuery();

  const resumeSkills = useMemo(() => profile?.skills.map((s) => s.name) ?? [], [profile?.skills]);

  const { fromResume, suggested } = useMemo(
    () => suggestStack(category, resumeSkills),
    [category, resumeSkills],
  );

  const toggle = (item: string) => {
    if (stack.includes(item)) {
      patchDraft({ stack: stack.filter((x) => x !== item) });
    } else {
      patchDraft({ stack: [...stack, item] });
    }
  };

  const showError = stack.length === 0;

  return (
    <Stack gap={4}>
      <p className="text-[12px] text-[var(--color-text-dim)]">{t('hint')}</p>

      {fromResume.length > 0 ? (
        <Stack gap={2}>
          <SectionTitle>
            <span className="inline-flex items-center gap-1.5">
              <Icon.Spark size={12} className="fill-current text-[var(--color-accent)]" />
              {t('fromResume')}
            </span>
          </SectionTitle>
          <div className="flex min-w-0 flex-wrap gap-1.5">
            {fromResume.map((s) => (
              <ChipButton key={s} label={s} on={stack.includes(s)} onToggle={() => toggle(s)} />
            ))}
          </div>
        </Stack>
      ) : null}

      {suggested.length > 0 ? (
        <Stack gap={2}>
          <SectionTitle>{fromResume.length > 0 ? t('suggestedMore') : t('suggested')}</SectionTitle>
          <div className="flex min-w-0 flex-wrap gap-1.5">
            {suggested.map((s) => (
              <ChipButton key={s} label={s} on={stack.includes(s)} onToggle={() => toggle(s)} />
            ))}
          </div>
        </Stack>
      ) : null}

      <p
        className={`text-[12px] ${
          showError ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-dim)]'
        }`}
      >
        {showError ? t('errorPickAtLeastOne') : t('selected', { count: stack.length })}
      </p>
    </Stack>
  );
}

function ChipButton({
  label,
  on,
  onToggle,
}: {
  label: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex min-h-[2.25rem] min-w-0 items-center gap-1.5 rounded-[var(--radius-full)] border px-3 py-1.5 text-[13px] font-semibold transition-colors ${
        on
          ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-ink)]'
          : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]'
      }`}
    >
      {on ? <Icon.Star size={11} className="fill-current" /> : null}
      <span className="min-w-0 truncate">{label}</span>
    </button>
  );
}
