'use client';

import { Icon } from '@/components/icons';
import { Stack } from '@/components/ui/layout';
import { COUNTRIES, flagFor } from '@/features/wizard/data/countries';
import { useWizardDraft } from '@/features/wizard/draft-store';
import { isStarsTestModeOnClient } from '@/lib/payments/test-mode-client';
import { type Complexity, priceCampaign } from '@ai-job-bot/core';
import { useTranslations } from 'next-intl';

export interface StepSummaryProps {
  /** Indices in the active step list — wizard-screen passes them so the
   *  pencil buttons can jump directly to the correct screen even when the
   *  profile / stack steps are dynamically skipped. */
  readonly stepIndex: {
    profile: number | undefined;
    category: number;
    roles: number;
    countries: number;
    salary: number;
    stack: number | undefined;
    languages: number;
    quota: number;
  };
  readonly onEdit: (index: number) => void;
  /** Display name of the profile this campaign will use. `null` when the
   *  user has 0–1 profiles — the row is hidden in that case (no choice was
   *  asked of them, so showing it is just noise). */
  readonly profileName: string | null;
}

export function StepSummary({ stepIndex, onEdit, profileName }: StepSummaryProps) {
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

  const testMode = isStarsTestModeOnClient();
  const categoryLabel = draft.category ? tCat(draft.category) : '—';
  const countriesLabel =
    draft.countries.length > 0
      ? draft.countries
          .map((code) => {
            const entry = COUNTRIES.find((c) => c.code === code);
            return `${flagFor(code)} ${entry?.name ?? code}`;
          })
          .join(', ')
      : '—';
  const stackLabel = draft.stack.length > 0 ? draft.stack.join(', ') : '—';
  const langsLabel = draft.languages.length > 0 ? draft.languages.join(', ') : '—';
  const salaryLabel =
    draft.salaryMin !== undefined && draft.salaryMax !== undefined
      ? `$${draft.salaryMin.toLocaleString('en-US')} – $${draft.salaryMax.toLocaleString('en-US')}`
      : draft.salaryMin
        ? t('summary.salaryFrom', { amount: draft.salaryMin.toLocaleString('en-US') })
        : '—';

  const fmtCents = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const subtotalAfterCategoryCents = breakdown
    ? Math.round(breakdown.baseRateCents * breakdown.quota * breakdown.categoryMultiplier)
    : 0;

  return (
    <Stack gap={4}>
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
        {profileName !== null && stepIndex.profile !== undefined ? (
          <SummaryRow
            label={t('summary.profile')}
            value={profileName}
            onEdit={() => onEdit(stepIndex.profile as number)}
          />
        ) : null}
        <SummaryRow
          label={t('summary.category')}
          value={categoryLabel}
          onEdit={() => onEdit(stepIndex.category)}
        />
        <SummaryRow
          label={t('summary.roles')}
          value={
            draft.roles.length > 0 ? draft.roles.join(', ') : t('summary.rolesCount', { count: 0 })
          }
          onEdit={() => onEdit(stepIndex.roles)}
        />
        <SummaryRow
          label={t('summary.countries')}
          value={countriesLabel}
          onEdit={() => onEdit(stepIndex.countries)}
        />
        <SummaryRow
          label={t('summary.salary')}
          value={salaryLabel}
          mono
          onEdit={() => onEdit(stepIndex.salary)}
        />
        {stepIndex.stack !== undefined ? (
          <SummaryRow
            label={t('summary.stack')}
            value={stackLabel}
            onEdit={() => onEdit(stepIndex.stack as number)}
          />
        ) : null}
        <SummaryRow
          label={t('summary.languages')}
          value={langsLabel}
          onEdit={() => onEdit(stepIndex.languages)}
        />
        <SummaryRow
          label={t('summary.quota')}
          value={String(draft.quota)}
          mono
          onEdit={() => onEdit(stepIndex.quota)}
        />
      </div>

      {breakdown ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-accent)] bg-[var(--color-accent-bg)] px-4 py-4">
          <Stack gap={2}>
            <BreakdownRow
              label={t('breakdown.base')}
              hint={t('breakdown.baseHint')}
              amount={`${fmtCents(breakdown.baseRateCents)}/app`}
            />
            <BreakdownRow
              label={t('breakdown.quota', { count: draft.quota })}
              hint={t('breakdown.quotaHint')}
              amount={`= ${fmtCents(breakdown.baseRateCents * draft.quota)}`}
            />
            <BreakdownRow
              label={t('breakdown.category', {
                category: draft.category ?? '—',
                mult: breakdown.categoryMultiplier,
              })}
              hint={t('breakdown.categoryHint')}
              amount={`= ${fmtCents(subtotalAfterCategoryCents)}`}
            />
            <BreakdownRow
              label={t('breakdown.complexity', {
                mult: breakdown.complexityMultiplier,
              })}
              hint={t('breakdown.complexityHint')}
              amount={`= ${fmtCents(breakdown.amountCents)}`}
            />
            <div className="my-1 h-px bg-[var(--color-accent)]/30" />
            <div className="flex items-baseline justify-between">
              <span className="text-[15px] font-bold text-[var(--color-text)]">
                {t('summary.total')}
              </span>
              <span className="font-mono text-[22px] font-bold text-[var(--color-accent)]">
                {fmtCents(breakdown.amountCents)}
              </span>
            </div>
            <p className="text-[11px] text-[var(--color-text-mute)]">
              {testMode
                ? t('breakdown.testMode')
                : t('breakdown.equivalent', {
                    stars: Math.round(breakdown.amountCents * 0.5),
                    ton: (breakdown.amountCents * 0.0004).toFixed(2),
                  })}
            </p>
          </Stack>
        </div>
      ) : null}
    </Stack>
  );
}

function SummaryRow({
  label,
  value,
  mono,
  onEdit,
}: {
  label: string;
  value: string;
  mono?: boolean;
  onEdit: () => void;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 border-b border-[var(--color-border)] px-4 py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wider text-[var(--color-text-dim)]">{label}</p>
        <p
          className={`mt-0.5 truncate text-[14px] text-[var(--color-text)] ${
            mono ? 'font-mono' : ''
          }`}
        >
          {value}
        </p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Edit ${label}`}
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--color-text-dim)] hover:bg-[var(--color-bg-2)] hover:text-[var(--color-accent)]"
      >
        <Icon.Pencil size={14} />
      </button>
    </div>
  );
}

function BreakdownRow({
  label,
  hint,
  amount,
}: {
  label: string;
  hint: string;
  amount: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex min-w-0 items-baseline justify-between gap-3 text-[13px] text-[var(--color-text)]">
        <span className="min-w-0 truncate font-medium">{label}</span>
        <span className="shrink-0 font-mono text-[var(--color-text-dim)]">{amount}</span>
      </div>
      <p className="text-[11px] leading-tight text-[var(--color-text-mute)]">{hint}</p>
    </div>
  );
}
