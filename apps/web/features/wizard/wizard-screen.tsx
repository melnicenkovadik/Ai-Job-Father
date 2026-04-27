'use client';

import { useTelegramBackButton } from '@/components/telegram/use-back-button';
import { Headline, MainButtonBinding, WizardProgress } from '@/components/ui';
import { Screen, Scroll, Stack } from '@/components/ui/layout';
import { computePrice, useMockStore } from '@/lib/mocks/store';
import type { WizardDraft } from '@/lib/mocks/types';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
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

interface WizardScreenProps {
  initialStep?: number;
}

export function WizardScreen({ initialStep }: WizardScreenProps = {}) {
  const t = useTranslations('screens.wizard');
  const router = useRouter();
  const { step, setStep, draft, createCampaignFromDraft, resetDraft } = useMockStore(
    useShallow((s) => ({
      step: s.wizard.step,
      setStep: s.setStep,
      draft: s.wizard.draft,
      createCampaignFromDraft: s.createCampaignFromDraft,
      resetDraft: s.resetDraft,
    })),
  );

  const effectiveStep =
    typeof initialStep === 'number' ? Math.max(0, Math.min(TOTAL - 1, initialStep)) : step;

  const price = useMemo(() => computePrice(draft), [draft]);

  const goBack = useCallback(() => {
    if (effectiveStep > 0) {
      setStep(effectiveStep - 1);
    } else {
      router.back();
    }
  }, [effectiveStep, setStep, router]);

  useTelegramBackButton(goBack);

  const stepKey = STEP_KEYS[effectiveStep] ?? 'category';

  const advance = useCallback(() => {
    if (effectiveStep < TOTAL - 1) {
      setStep(effectiveStep + 1);
      return;
    }
    const campaign = createCampaignFromDraft(draft);
    resetDraft();
    router.push(`/campaign/${campaign.id}/checkout`);
  }, [effectiveStep, setStep, createCampaignFromDraft, draft, resetDraft, router]);

  const ctaText =
    effectiveStep === TOTAL - 1 ? t('submit', { amount: `${price.amount} ⭐` }) : t('next');
  const canAdvance = canStepAdvance(stepKey, draft);

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
          label={`${price.amount} ⭐`}
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
