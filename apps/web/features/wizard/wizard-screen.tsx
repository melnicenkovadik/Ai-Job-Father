'use client';

import { useTelegramBackButton } from '@/components/telegram/use-back-button';
import { Headline, MainButtonBinding, WizardProgress } from '@/components/ui';
import { Screen, Scroll, Stack } from '@/components/ui/layout';
import { useCreateCampaign } from '@/features/campaigns/use-campaigns';
import { useProfilesQuery } from '@/features/profiles-list/use-profiles';
import { type Complexity, priceCampaign } from '@ai-job-bot/core';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { type WizardDraft, useWizardStore } from './draft-store';
import { StepCategory } from './steps/step-category';
import { StepCountries } from './steps/step-countries';
import { StepLanguages } from './steps/step-languages';
import { StepQuota } from './steps/step-quota';
import { StepRoles } from './steps/step-roles';
import { StepSalary } from './steps/step-salary';
import { StepStack } from './steps/step-stack';
import { StepSummary } from './steps/step-summary';

const TOTAL = 8;
const STEP_KEYS = [
  'category',
  'roles',
  'countries',
  'salary',
  'stack',
  'languages',
  'quota',
  'checkout',
] as const;

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

  const effectiveStep =
    typeof initialStep === 'number' ? Math.max(0, Math.min(TOTAL - 1, initialStep)) : step;

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

  const stepKey = STEP_KEYS[effectiveStep] ?? 'category';
  const defaultProfile = profiles.find((p) => p.isDefault) ?? profiles[0];

  const advance = useCallback(() => {
    if (effectiveStep < TOTAL - 1) {
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
          resetDraft();
          router.push(`/campaign/${campaign.id}/checkout`);
        },
      },
    );
  }, [effectiveStep, setStep, create, draft, defaultProfile, resetDraft, router]);

  const priceLabel = breakdown ? formatCents(breakdown.amountCents) : '—';
  const ctaText = effectiveStep === TOTAL - 1 ? t('submit', { amount: priceLabel }) : t('next');
  const canAdvance =
    canStepAdvance(stepKey, draft) &&
    !create.isPending &&
    !(effectiveStep === TOTAL - 1 && !defaultProfile);

  return (
    <Screen>
      <Stack gap={3} className="px-4 pb-2 pt-4">
        <WizardProgress
          step={effectiveStep + 1}
          total={TOTAL}
          leading={t('step', {
            current: String(effectiveStep + 1).padStart(2, '0'),
            total: String(TOTAL).padStart(2, '0'),
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
          <StepBody stepKey={stepKey} />
        </div>

        {effectiveStep === TOTAL - 1 && !defaultProfile ? (
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

      <MainButtonBinding text={ctaText} onClick={advance} disabled={!canAdvance} />
    </Screen>
  );
}

function StepBody({ stepKey }: { stepKey: (typeof STEP_KEYS)[number] }) {
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
      return <StepSummary />;
    default:
      return null;
  }
}

function canStepAdvance(stepKey: (typeof STEP_KEYS)[number], draft: WizardDraft): boolean {
  switch (stepKey) {
    case 'category':
      return Boolean(draft.category);
    case 'roles':
      return draft.roles.length > 0;
    case 'countries':
      return draft.countries.length > 0;
    default:
      return true;
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
