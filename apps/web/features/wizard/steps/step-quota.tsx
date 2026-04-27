'use client';

import { Icon } from '@/components/icons';
import { Stack } from '@/components/ui/layout';
import { useMockStore } from '@/lib/mocks/store';
import { useTranslations } from 'next-intl';
import { useShallow } from 'zustand/shallow';

const MIN = 10;
const MAX = 100;
const STEP = 5;

export function StepQuota() {
  const t = useTranslations('screens.wizard.quota');
  const { quota, patchDraft } = useMockStore(
    useShallow((s) => ({
      quota: s.wizard.draft.quota,
      patchDraft: s.patchDraft,
    })),
  );

  return (
    <Stack gap={4}>
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-7 text-center">
        <p className="mb-2 text-[11px] uppercase tracking-wider text-[var(--color-text-dim)]">
          {t('label')}
        </p>
        <p className="font-mono text-[64px] font-bold leading-none tracking-tighter text-[var(--color-accent)]">
          {quota}
        </p>
        <p className="mt-2 text-[13px] text-[var(--color-text-dim)]">
          {t('hint', { min: quota * 3, max: quota * 5 })}
        </p>
      </div>
      <Stack gap={1}>
        <input
          type="range"
          min={MIN}
          max={MAX}
          step={STEP}
          value={quota}
          onChange={(e) => patchDraft({ quota: Number(e.target.value) })}
          className="w-full accent-[var(--color-accent)]"
          aria-label={t('label')}
        />
        <div className="flex min-w-0 items-center justify-between font-mono text-[11px] text-[var(--color-text-mute)]">
          <span>{MIN}</span>
          <span>{MAX}</span>
        </div>
      </Stack>
      <div className="flex min-w-0 items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-accent-bg)] px-3.5 py-3 text-[13px] text-[var(--color-accent)]">
        <Icon.Spark size={14} className="shrink-0 fill-current" />
        <span className="min-w-0">{t('priceNote')}</span>
      </div>
    </Stack>
  );
}
