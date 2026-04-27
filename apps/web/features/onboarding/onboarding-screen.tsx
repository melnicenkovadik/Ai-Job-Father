'use client';

import { Icon } from '@/components/icons';
import { Headline, MainButtonBinding } from '@/components/ui';
import { Screen, Scroll, Stack } from '@/components/ui/layout';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCompleteOnboarding } from './use-onboarding';

export function OnboardingScreen() {
  const t = useTranslations('screens.onboarding');
  const router = useRouter();
  const complete = useCompleteOnboarding();

  const handleStart = () => {
    if (complete.isPending) return;
    complete.mutate(undefined, {
      onSuccess: () => router.push('/profile/upload'),
    });
  };

  return (
    <Screen>
      <Scroll className="flex-1">
        <Stack gap={6} className="min-h-full justify-center px-6 py-12">
          <div className="inline-flex size-24 items-center justify-center rounded-[var(--radius-xl)] bg-[var(--color-accent-bg)]">
            <Icon.Spark size={48} className="text-[var(--color-accent)]" />
          </div>

          <Stack gap={3}>
            <Headline>{t('headline')}</Headline>
            <p className="text-[16px] leading-relaxed text-[var(--color-text-dim)]">
              {t('description')}
            </p>
          </Stack>

          <Stack gap={2}>
            <Feature
              icon={<Icon.Doc size={18} className="text-[var(--color-accent)]" />}
              title={t('feature.parse.title')}
              subtitle={t('feature.parse.subtitle')}
            />
            <Feature
              icon={<Icon.Search size={18} className="text-[var(--color-accent)]" />}
              title={t('feature.search.title')}
              subtitle={t('feature.search.subtitle')}
            />
            <Feature
              icon={<Icon.Star size={18} className="text-[var(--color-accent)]" />}
              title={t('feature.pay.title')}
              subtitle={t('feature.pay.subtitle')}
            />
          </Stack>
        </Stack>
      </Scroll>
      <MainButtonBinding text={t('start')} onClick={handleStart} />
    </Screen>
  );
}

function Feature({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-accent-bg)]">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-semibold text-[var(--color-text)]">{title}</div>
        <div className="mt-0.5 text-[13px] text-[var(--color-text-dim)] [overflow-wrap:anywhere]">
          {subtitle}
        </div>
      </div>
    </div>
  );
}
