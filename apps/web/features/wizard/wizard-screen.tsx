'use client';

import { useTelegramBackButton } from '@/components/telegram/use-back-button';
import { Headline, MainButtonBinding, WizardProgress } from '@/components/ui';
import { Screen, Scroll, Stack } from '@/components/ui/layout';
import { useCreateCampaign } from '@/features/campaigns/use-campaigns';
import { useProfilesQuery } from '@/features/profiles-list/use-profiles';
import { categoryNeedsStack } from '@/features/wizard/data/category-stack';
import { type Complexity, priceCampaign } from '@ai-job-bot/core';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo } from 'react';
import { type WizardDraft, useWizardStore } from './draft-store';
import { StepCategory } from './steps/step-category';
import { StepCountries } from './steps/step-countries';
import { StepLanguages } from './steps/step-languages';
import { StepQuota } from './steps/step-quota';
import { StepRoles } from './steps/step-roles';
import { StepSalary } from './steps/step-salary';
import { StepStack } from './steps/step-stack';
import { StepSummary } from './steps/step-summary';

const BASE_STEP_KEYS = [
  'category',
  'roles',
  'countries',
  'salary',
  'stack',
  'languages',
  'quota',
  'checkout',
] as const;

type StepKey = (typeof BASE_STEP_KEYS)[number];

const CATEGORY_FALLBACK_TITLE: Record<string, string> = {
  tech: 'Tech Specialist',
  design: 'Designer',
  marketing: 'Marketer',
  sales: 'Sales',
  product: 'Product Manager',
  finance: 'Finance Pro',
  hr: 'HR Specialist',
  support: 'Support Specialist',
  content: 'Content Pro',
  ops: 'Operations',
  data: 'Data Specialist',
  web3: 'Web3 Engineer',
};

interface WizardScreenProps {
  initialStep?: number;
}

export function WizardScreen({ initialStep }: WizardScreenProps = {}) {
  const t = useTranslations('screens.wizard');
  const router = useRouter();
  const step = useWizardStore((s) => s.step);
  const draft = useWizardStore((s) => s.draft);
  const setStep = useWizardStore((s) => s.setStep);
  const resetDraft = useWizardStore((s) => s.resetDraft);
  const { data: profiles = [] } = useProfilesQuery();
  const create = useCreateCampaign();

  // The stack step is dropped for non-tech categories — the UX matches what
  // users expect on LinkedIn and other job-adjacent flows.
  const stepKeys = useMemo<readonly StepKey[]>(() => {
    if (categoryNeedsStack(draft.category)) return BASE_STEP_KEYS;
    return BASE_STEP_KEYS.filter((k) => k !== 'stack');
  }, [draft.category]);

  const total = stepKeys.length;

  const effectiveStep =
    typeof initialStep === 'number'
      ? Math.max(0, Math.min(total - 1, initialStep))
      : Math.max(0, Math.min(total - 1, step));

  // If the active step list shrinks (e.g. user picked design after starting on
  // tech), clamp the persisted step pointer so we don't render past the end.
  useEffect(() => {
    if (step >= total) setStep(total - 1);
  }, [step, total, setStep]);

  const breakdown = draft.category
    ? priceCampaign({
        category: draft.category,
        quota: draft.quota,
        complexity: 'medium' as Complexity,
      })
    : null;

  const goBack = useCallback(() => {
    if (effectiveStep > 0) {
      setStep(effectiveStep - 1);
    } else {
      router.back();
    }
  }, [effectiveStep, setStep, router]);

  useTelegramBackButton(goBack);

  const stepKey = stepKeys[effectiveStep] ?? 'category';
  const defaultProfile = profiles.find((p) => p.isDefault) ?? profiles[0];

  const stepIndices = useMemo(() => {
    const idx = (k: StepKey): number | undefined => {
      const i = stepKeys.indexOf(k);
      return i >= 0 ? i : undefined;
    };
    return {
      category: idx('category') ?? 0,
      roles: idx('roles') ?? 0,
      countries: idx('countries') ?? 0,
      salary: idx('salary') ?? 0,
      stack: idx('stack'),
      languages: idx('languages') ?? 0,
      quota: idx('quota') ?? 0,
    };
  }, [stepKeys]);

  const advance = useCallback(() => {
    if (effectiveStep < total - 1) {
      setStep(effectiveStep + 1);
      return;
    }
    if (!draft.category) return;
    if (!defaultProfile) return;
    create.mutate(
      {
        profileId: defaultProfile.id,
        title: titleFromDraft(draft),
        category: draft.category,
        quota: draft.quota,
        countries: draft.countries,
        complexity: 'medium',
      },
      {
        onSuccess: (campaign) => {
          // Push first, reset second. If we reset before navigation and the
          // route load briefly fails, the user lands on a blank wizard with
          // no draft — looks like being thrown back to main.
          router.push(`/campaign/${campaign.id}/checkout`);
          resetDraft();
        },
      },
    );
  }, [effectiveStep, total, setStep, create, draft, defaultProfile, resetDraft, router]);

  const priceLabel = breakdown ? formatCents(breakdown.amountCents) : '—';
  const ctaText = effectiveStep === total - 1 ? t('submit', { amount: priceLabel }) : t('next');
  const canAdvance =
    canStepAdvance(stepKey, draft) &&
    !create.isPending &&
    !(effectiveStep === total - 1 && !defaultProfile);

  return (
    <Screen>
      <Stack gap={3} className="px-4 pb-2 pt-4">
        <WizardProgress
          step={effectiveStep + 1}
          total={total}
          leading={t('step', {
            current: String(effectiveStep + 1).padStart(2, '0'),
            total: String(total).padStart(2, '0'),
          })}
          label={priceLabel}
        />
      </Stack>

      <Scroll className="flex-1">
        <Stack gap={1} className="px-4 pt-2">
          <Headline size="md">{t(`label.${stepKey}`)}</Headline>
          <p className="text-[13px] text-[var(--color-text-dim)]">{t(`description.${stepKey}`)}</p>
        </Stack>

        <div className="px-4 py-4">
          <StepBody stepKey={stepKey} stepIndices={stepIndices} onJump={setStep} />
        </div>

        {effectiveStep === total - 1 && !defaultProfile ? (
          <p className="mx-4 mb-4 rounded-[var(--radius-md)] border border-[var(--color-warn)] bg-[var(--color-warn)]/10 px-3 py-3 text-[13px] text-[var(--color-warn)]">
            {t('summary.noProfile') || 'Create a profile first.'}
          </p>
        ) : null}
        {create.isError ? (
          <p className="mx-4 mb-4 rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger)]/10 px-3 py-3 text-[13px] text-[var(--color-danger)]">
            {create.error.message}
          </p>
        ) : null}
      </Scroll>

      <MainButtonBinding
        text={ctaText}
        onClick={advance}
        disabled={!canAdvance}
        loading={create.isPending}
      />
    </Screen>
  );
}

function StepBody({
  stepKey,
  stepIndices,
  onJump,
}: {
  stepKey: StepKey;
  stepIndices: {
    category: number;
    roles: number;
    countries: number;
    salary: number;
    stack: number | undefined;
    languages: number;
    quota: number;
  };
  onJump: (i: number) => void;
}) {
  switch (stepKey) {
    case 'category':
      return <StepCategory />;
    case 'roles':
      return <StepRoles />;
    case 'countries':
      return <StepCountries />;
    case 'salary':
      return <StepSalary />;
    case 'stack':
      return <StepStack />;
    case 'languages':
      return <StepLanguages />;
    case 'quota':
      return <StepQuota />;
    case 'checkout':
      return <StepSummary stepIndex={stepIndices} onEdit={onJump} />;
    default:
      return null;
  }
}

/**
 * Per-step gate. The MainButton is disabled when this returns false; the
 * whole point is that NO step can be skipped with empty required fields.
 *
 * - category: must pick one of the 12.
 * - roles: ≥ 1 role.
 * - countries: ≥ 1 country code.
 * - salary: salaryMin must be set and ≥ 400; salaryMax ≥ salaryMin.
 * - stack: only required when categoryNeedsStack — non-tech skips this step.
 * - languages: ≥ 1 language for the interview funnel.
 * - quota: must be 10..100 (range covers the slider min/max).
 * - checkout: category set (precondition for pricing); profile existence is
 *   checked separately so the user sees a "no profile" warning rather than a
 *   silent disabled button.
 */
function canStepAdvance(stepKey: StepKey, draft: WizardDraft): boolean {
  switch (stepKey) {
    case 'category':
      return Boolean(draft.category);
    case 'roles':
      return draft.roles.length > 0;
    case 'countries':
      return draft.countries.length > 0;
    case 'salary':
      return (
        draft.salaryMin !== undefined &&
        draft.salaryMax !== undefined &&
        draft.salaryMin >= 400 &&
        draft.salaryMax >= draft.salaryMin
      );
    case 'stack':
      return draft.stack.length > 0;
    case 'languages':
      return draft.languages.length > 0;
    case 'quota':
      return draft.quota >= 10 && draft.quota <= 100;
    case 'checkout':
      return Boolean(draft.category);
    default:
      return false;
  }
}

function titleFromDraft(draft: WizardDraft): string {
  if (draft.roles[0]) return draft.roles[0].slice(0, 80);
  if (draft.category) return CATEGORY_FALLBACK_TITLE[draft.category] ?? 'Campaign';
  return 'New campaign';
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
