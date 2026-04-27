'use client';

import { Stack } from '@/components/ui/layout';
import { useMockStore } from '@/lib/mocks/store';
import { useTranslations } from 'next-intl';
import { useShallow } from 'zustand/shallow';

const MIN = 1000;
const MAX = 15000;
const STEP = 500;

export function StepSalary() {
  const t = useTranslations('screens.wizard.salary');
  const { salaryMin, patchDraft } = useMockStore(
    useShallow((s) => ({
      salaryMin: s.wizard.draft.salaryMin ?? 5000,
      patchDraft: s.patchDraft,
    })),
  );

  return (
    <Stack gap={4}>
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-7 text-center">
        <p className="mb-2 text-[11px] uppercase tracking-wider text-[var(--color-text-dim)]">
          {t('label')}
        </p>
        <p className="font-mono text-[44px] font-bold leading-none tracking-tight text-[var(--color-text)]">
          ${salaryMin.toLocaleString('en-US')}
        </p>
      </div>
      <Stack gap={1}>
        <input
          type="range"
          min={MIN}
          max={MAX}
          step={STEP}
          value={salaryMin}
          onChange={(e) => patchDraft({ salaryMin: Number(e.target.value) })}
          className="w-full accent-[var(--color-accent)]"
          aria-label={t('label')}
        />
        <div className="flex min-w-0 items-center justify-between font-mono text-[11px] text-[var(--color-text-mute)]">
          <span>{t('min')}</span>
          <span>{t('max')}</span>
        </div>
      </Stack>
    </Stack>
  );
}
