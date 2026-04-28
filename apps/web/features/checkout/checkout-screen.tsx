'use client';

import { Icon } from '@/components/icons';
import { useTelegramBackButton } from '@/components/telegram/use-back-button';
import {
  Headline,
  MainButtonBinding,
  type PaymentMethod,
  PaymentMethodCard,
  SectionTitle,
} from '@/components/ui';
import { Screen, Scroll, Section, Stack } from '@/components/ui/layout';
import { formatPriceUsd } from '@/features/campaigns/format';
import { useCampaignQuery } from '@/features/campaigns/use-campaigns';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface CheckoutScreenProps {
  campaignId: string;
}

// Rough demo conversions until Wave D wires real Stars/TON quotes.
const STARS_PER_USD_CENT = 0.5; // 50¢ → 25 ⭐
const TON_PER_USD_CENT = 0.0004; // ≈ $2.50/TON

export function CheckoutScreen({ campaignId }: CheckoutScreenProps) {
  const t = useTranslations('screens.checkout');
  const router = useRouter();
  const { data: campaign, isLoading } = useCampaignQuery(campaignId);
  const [method, setMethod] = useState<PaymentMethod>('stars');

  useTelegramBackButton('/');

  if (isLoading) {
    return (
      <Screen>
        <Scroll className="flex-1">
          <Stack gap={2} className="px-6 py-12 text-center">
            <p className="text-[14px] text-[var(--color-text-dim)]">…</p>
          </Stack>
        </Scroll>
      </Screen>
    );
  }

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

  const usdLabel = formatPriceUsd(campaign.priceAmountCents);
  const starsAmount = Math.round(campaign.priceAmountCents * STARS_PER_USD_CENT);
  const tonAmount = (campaign.priceAmountCents * TON_PER_USD_CENT).toFixed(2);
  const ctaAmount = method === 'stars' ? `${starsAmount} ⭐` : `${tonAmount} TON`;

  const onPay = () => {
    router.push(`/campaign/${campaignId}/payment?method=${method}`);
  };

  return (
    <Screen>
      <Scroll className="flex-1">
        <Stack gap={3} className="px-4 pb-4 pt-6">
          <Stack gap={1}>
            <Headline size="md">{t('title')}</Headline>
            <p className="text-[13px] text-[var(--color-text-dim)]">
              {t('campaignSummary', {
                title: campaign.title,
                count: campaign.quota,
              })}
            </p>
          </Stack>

          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <p className="mb-2 text-[11px] uppercase tracking-wider text-[var(--color-text-dim)]">
              {t('totalLabel')}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[36px] font-bold leading-none tracking-tight text-[var(--color-text)]">
                {method === 'stars' ? starsAmount : tonAmount}
              </span>
              <span className="text-[16px] font-semibold text-[var(--color-accent)]">
                {method === 'stars' ? '⭐ Stars' : 'TON'}
              </span>
            </div>
            <p className="mt-1 font-mono text-[12px] text-[var(--color-text-mute)]">≈ {usdLabel}</p>
          </div>
        </Stack>

        <Section title={<SectionTitle>{t('methodSection')}</SectionTitle>} className="py-2">
          <Stack gap={2}>
            <PaymentMethodCard
              method="stars"
              selected={method === 'stars'}
              onSelect={() => setMethod('stars')}
              label={t('method.stars')}
              hint={t('method.starsHint')}
              badge={t('method.starsBadge')}
              amount={`${starsAmount} ⭐`}
            />
            <PaymentMethodCard
              method="ton"
              selected={method === 'ton'}
              onSelect={() => setMethod('ton')}
              label={t('method.ton')}
              hint={t('method.tonHint')}
              amount={`${tonAmount} TON`}
            />
          </Stack>
        </Section>

        <div className="px-4 pb-2">
          <div className="flex min-w-0 items-start gap-2 rounded-[var(--radius-md)] bg-[var(--color-bg-2)] px-3 py-3 text-[12px] text-[var(--color-text-dim)]">
            <Icon.Alert size={14} className="mt-px shrink-0" />
            <span className="min-w-0">{t('noteRefund')}</span>
          </div>
        </div>
      </Scroll>

      <MainButtonBinding text={t('pay', { amount: ctaAmount })} onClick={onPay} />
    </Screen>
  );
}
