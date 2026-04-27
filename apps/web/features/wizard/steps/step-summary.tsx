'use client';

import { FieldRow } from '@/components/ui';
import { Stack } from '@/components/ui/layout';
import { useWizardDraft } from '@/features/wizard/draft-store';
import { type Complexity, priceCampaign } from '@ai-job-bot/core';
import { useTranslations } from 'next-intl';

export function StepSummary() {
  const t = useTranslations('screens.wizard');
  const tCat = useTranslations('screens.wizard.category');
  const draft = useWizardDraft((s) => s.draft);

  const breakdown = draft.category
    ? priceCampaign({
        category: draft.category,
        quota: draft.quota,
        complexity: 'medium' as Complexity,
      })
    : null;

  const categoryLabel = draft.category ? tCat(draft.category) : '—';
  const countriesLabel = draft.countries.length > 0 ? draft.countries.join(', ') : '—';
  const stackLabel = draft.stack.length > 0 ? draft.stack.join(', ') : '—';
  const langsLabel = draft.languages.length > 0 ? draft.languages.join(', ') : '—';
  const salaryLabel = draft.salaryMin
    ? t('summary.salaryFrom', { amount: draft.salaryMin.toLocaleString('en-US') })
    : '—';

  return (
    <Stack gap={4}>
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4">
        <FieldRow label={t('summary.category')} value={categoryLabel} />
        <FieldRow
          label={t('summary.roles')}
          value={t('summary.rolesCount', { count: draft.roles.length })}
        />
        <FieldRow label={t('summary.countries')} value={countriesLabel} />
        <FieldRow label={t('summary.salary')} value={salaryLabel} mono />
        <FieldRow label={t('summary.stack')} value={stackLabel} />
        <FieldRow label={t('summary.languages')} value={langsLabel} />
        <FieldRow label={t('summary.quota')} value={String(draft.quota)} mono />
      </div>

      {breakdown ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-accent)] bg-[var(--color-accent-bg)] px-4 py-4">
          <Stack gap={2}>
            <BreakdownRow
              label={t('summary.basePrice')}
              amount={`${formatCents(breakdown.baseRateCents)}/app`}
            />
            <BreakdownRow
              label={t('summary.quotaRow', { count: draft.quota })}
              amount={`× ${draft.quota}`}
            />
            <BreakdownRow
              label={`× ${breakdown.categoryMultiplier} (${draft.category})`}
              amount=""
            />
            <BreakdownRow label={`× ${breakdown.complexityMultiplier} (medium)`} amount="" />
            <div className="my-1 h-px bg-[var(--color-accent)]/30" />
            <div className="flex items-baseline justify-between">
              <span className="text-[15px] font-bold text-[var(--color-text)]">
                {t('summary.total')}
              </span>
              <span className="font-mono text-[22px] font-bold text-[var(--color-accent)]">
                {formatCents(breakdown.amountCents)}
              </span>
            </div>
          </Stack>
        </div>
      ) : null}
    </Stack>
  );
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function BreakdownRow({ label, amount }: { label: string; amount: string }) {
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-3 text-[13px] text-[var(--color-text)]">
      <span className="min-w-0 truncate">{label}</span>
      <span className="shrink-0 font-mono text-[var(--color-text-dim)]">{amount}</span>
    </div>
  );
}
