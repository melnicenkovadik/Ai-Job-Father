'use client';

import { Icon } from '@/components/icons';
import { Stack } from '@/components/ui/layout';
import { useWizardDraft } from '@/features/wizard/draft-store';
import { useTranslations } from 'next-intl';

const MIN = 10;
const MAX = 100;
const STEP = 5;

/**
 * Conversion heuristics from quota → expected pipeline numbers. Numbers are
 * "ballpark, based on similar campaigns" — not a contract. The downstream
 * worker calibrates these from real history once we have data.
 */
const APPLIES_PER_QUOTA_LOW = 3;
const APPLIES_PER_QUOTA_HIGH = 5;
const RESPONSE_RATE_LOW = 0.05;
const RESPONSE_RATE_HIGH = 0.15;
const MEETING_RATE_LOW = 0.2;
const MEETING_RATE_HIGH = 0.4;

export function StepQuota() {
  const t = useTranslations('screens.wizard.quota');
  const { quota, patchDraft } = useWizardDraft((s) => ({
    quota: s.draft.quota,
    patchDraft: s.patchDraft,
  }));

  const appliesLow = quota * APPLIES_PER_QUOTA_LOW;
  const appliesHigh = quota * APPLIES_PER_QUOTA_HIGH;
  const responsesLow = Math.max(1, Math.round(quota * RESPONSE_RATE_LOW));
  const responsesHigh = Math.max(1, Math.round(quota * RESPONSE_RATE_HIGH));
  const meetingsLow = Math.max(1, Math.round(responsesLow * MEETING_RATE_LOW));
  const meetingsHigh = Math.max(1, Math.round(responsesHigh * MEETING_RATE_HIGH));

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
          {t('hint', { min: appliesLow, max: appliesHigh })}
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

      <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-2)] p-4">
        <p className="mb-2 text-[11px] uppercase tracking-wider text-[var(--color-text-dim)]">
          {t('exampleLabel')}
        </p>
        <Stack gap={2}>
          <FunnelRow stage={t('funnel.applies')} value={`${appliesLow}–${appliesHigh}`} />
          <FunnelRow stage={t('funnel.responses')} value={`${responsesLow}–${responsesHigh}`} />
          <FunnelRow stage={t('funnel.meetings')} value={`${meetingsLow}–${meetingsHigh}`} />
        </Stack>
        <p className="mt-3 text-[11px] leading-relaxed text-[var(--color-text-mute)]">
          {t('exampleNote')}
        </p>
      </div>

      <div className="flex min-w-0 items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-accent-bg)] px-3.5 py-3 text-[13px] text-[var(--color-accent)]">
        <Icon.Spark size={14} className="shrink-0 fill-current" />
        <span className="min-w-0">{t('priceNote')}</span>
      </div>
    </Stack>
  );
}

function FunnelRow({ stage, value }: { stage: string; value: string }) {
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-3 text-[13px]">
      <span className="min-w-0 truncate text-[var(--color-text-dim)]">{stage}</span>
      <span className="shrink-0 font-mono font-semibold text-[var(--color-text)]">{value}</span>
    </div>
  );
}
