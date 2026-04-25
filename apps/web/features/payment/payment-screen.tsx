'use client';

import { Icon } from '@/components/icons';
import { useTelegramBackButton } from '@/components/telegram/use-back-button';
import { Button, FieldRow, Headline, MainButtonBinding } from '@/components/ui';
import { Screen, Scroll, Stack } from '@/components/ui/layout';
import { useMockStore } from '@/lib/mocks/store';
import type { PaymentMethod } from '@/lib/mocks/types';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type Phase = 'processing' | 'success' | 'fail';

const TON_RATE = 0.004;

interface PaymentScreenProps {
  campaignId: string;
  method: PaymentMethod;
  initialPhase?: Phase;
  simulate?: 'success' | 'fail';
}

export function PaymentScreen({
  campaignId,
  method,
  initialPhase = 'processing',
  simulate = 'success',
}: PaymentScreenProps) {
  const t = useTranslations('screens.payment');
  const router = useRouter();
  const campaign = useMockStore((s) => s.campaigns[campaignId]);
  const payCampaign = useMockStore((s) => s.payCampaign);
  const [phase, setPhase] = useState<Phase>(initialPhase);

  useEffect(() => {
    if (phase !== 'processing') return;
    const timer = setTimeout(() => {
      if (simulate === 'fail') {
        setPhase('fail');
        return;
      }
      payCampaign(campaignId, method);
      setPhase('success');
    }, 2200);
    return () => clearTimeout(timer);
  }, [phase, simulate, campaignId, method, payCampaign]);

  useTelegramBackButton(`/campaign/${campaignId}/checkout`);

  if (!campaign) {
    return (
      <Screen>
        <Scroll className="flex-1">
          <Stack gap={2} className="px-6 py-12 text-center">
            <Headline size="md">404</Headline>
            <p className="text-[14px] text-[var(--color-text-dim)]">
              Campaign not found · {campaignId}
            </p>
          </Stack>
        </Scroll>
      </Screen>
    );
  }

  const amount = campaign.price.amount;
  const amountLabel = method === 'stars' ? `${amount} ⭐` : `${(amount * TON_RATE).toFixed(2)} TON`;
  const provider = method === 'stars' ? 'TELEGRAM' : 'TON NETWORK';

  return (
    <Screen reserveMainButton={phase === 'success'}>
      <Scroll className="flex-1">
        <Stack gap={4} className="min-h-full items-center justify-center px-6 py-12 text-center">
          {phase === 'processing' ? (
            <ProcessingView
              method={method}
              title={t('processing')}
              subtitle={method === 'stars' ? t('processingStars') : t('processingTon')}
              secure={t('processingSecure', { provider })}
            />
          ) : null}
          {phase === 'success' ? (
            <SuccessView
              title={t('success')}
              hint={t('successHint')}
              amountLabel={amountLabel}
              rows={{
                amount: t('rows.amount'),
                transaction: t('rows.transaction'),
                when: t('rows.when'),
              }}
              method={method}
            />
          ) : null}
          {phase === 'fail' ? (
            <FailView
              title={t('fail')}
              hint={t('failHint')}
              retryLabel={t('retry')}
              onRetry={() => setPhase('processing')}
            />
          ) : null}
        </Stack>
      </Scroll>
      {phase === 'success' ? (
        <MainButtonBinding text={t('homeCta')} onClick={() => router.push('/')} />
      ) : null}
    </Screen>
  );
}

function ProcessingView({
  method,
  title,
  subtitle,
  secure,
}: {
  method: PaymentMethod;
  title: string;
  subtitle: string;
  secure: string;
}) {
  return (
    <>
      <div
        /* layout-safe: animated payment indicator — absolute children render the spinning ring around the icon. */
        className="relative inline-flex size-[7.5rem] items-center justify-center rounded-full bg-[var(--color-accent-bg)]"
      >
        <span className="absolute -inset-1 rounded-full border-[3px] border-[var(--color-accent)] border-t-transparent animate-spin" />
        <span className="text-[52px]">
          {method === 'stars' ? (
            '⭐'
          ) : (
            <Icon.Ton size={52} className="text-[var(--color-ton-blue)]" />
          )}
        </span>
      </div>
      <Headline size="md" className="text-center">
        {title}
      </Headline>
      <p className="max-w-[280px] text-[14px] text-[var(--color-text-dim)]">{subtitle}</p>
      <p className="flex min-w-0 items-center gap-1.5 font-mono text-[12px] uppercase tracking-wider text-[var(--color-text-mute)]">
        <span
          /* layout-safe: tiny status dot uses pulseSlow keyframes from globals. */
          className="inline-block size-1.5 animate-pulse-slow rounded-full bg-[var(--color-success)]"
        />
        {secure}
      </p>
    </>
  );
}

function SuccessView({
  title,
  hint,
  amountLabel,
  rows,
  method,
}: {
  title: string;
  hint: string;
  amountLabel: string;
  rows: { amount: string; transaction: string; when: string };
  method: PaymentMethod;
}) {
  return (
    <>
      <div className="inline-flex size-[7.5rem] animate-fade-up items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-accent-ink)]">
        <Icon.Check size={56} strokeWidth={3} />
      </div>
      <Headline size="md" className="text-center">
        {title}
      </Headline>
      <p className="text-[15px] text-[var(--color-text-dim)]">{hint}</p>
      <div className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-left">
        <FieldRow label={rows.amount} value={amountLabel} mono />
        <FieldRow
          label={rows.transaction}
          value={method === 'stars' ? 'tg_pmt_7a2f91' : 'EQCd2…7kJ'}
          mono
        />
        <FieldRow label={rows.when} value="14 апр · 09:41" mono />
      </div>
    </>
  );
}

function FailView({
  title,
  hint,
  retryLabel,
  onRetry,
}: {
  title: string;
  hint: string;
  retryLabel: string;
  onRetry: () => void;
}) {
  return (
    <>
      <div className="inline-flex size-[7.5rem] items-center justify-center rounded-full bg-[var(--color-danger)]/15 text-[var(--color-danger)]">
        <Icon.Alert size={48} />
      </div>
      <Headline size="md" className="text-center">
        {title}
      </Headline>
      <p className="text-[15px] text-[var(--color-text-dim)]">{hint}</p>
      <Button onClick={onRetry} variant="solid" size="lg">
        {retryLabel}
      </Button>
    </>
  );
}
