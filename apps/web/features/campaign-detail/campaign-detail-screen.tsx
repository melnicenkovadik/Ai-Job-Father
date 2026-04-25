'use client';

import { useTelegramBackButton } from '@/components/telegram/use-back-button';
import {
  CategoryChip,
  Headline,
  ProgressBar,
  SectionTitle,
  StatCard,
  StatusBadge,
  TimelineItem,
} from '@/components/ui';
import { Screen, Scroll, Section, Stack } from '@/components/ui/layout';
import { useMockStore } from '@/lib/mocks/store';
import { useTranslations } from 'next-intl';

interface CampaignDetailScreenProps {
  campaignId: string;
}

export function CampaignDetailScreen({ campaignId }: CampaignDetailScreenProps) {
  const t = useTranslations('screens.detail');
  const campaign = useMockStore((s) => s.campaigns[campaignId]);

  useTelegramBackButton('/');

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

  const pct = campaign.progress.quota
    ? Math.round((campaign.progress.applied / campaign.progress.quota) * 100)
    : 0;
  const events = campaign.events ?? [];
  const isLive = campaign.status === 'searching' || campaign.status === 'applying';
  const responses = Math.floor(campaign.progress.applied * 0.14);

  const snapshot: ReadonlyArray<readonly [string, string]> = [
    ['category', `"${campaign.category}"`],
    ['countries', JSON.stringify(campaign.countries)],
    ['quota', String(campaign.progress.quota)],
    ['price', `${campaign.price.amount} ${campaign.price.currency}`],
    ['status', `"${campaign.status}"`],
    ['schema_version', '1'],
  ];

  return (
    <Screen reserveMainButton={false}>
      <Scroll className="flex-1">
        <Stack gap={3} className="px-4 pb-4 pt-6">
          <div className="flex min-w-0 items-center gap-2">
            <CategoryChip category={campaign.category} size="sm" />
            <StatusBadge status={campaign.status} />
          </div>
          <Stack gap={1}>
            <Headline size="md">{campaign.title}</Headline>
            <p className="text-[13px] text-[var(--color-text-dim)]">
              <span>id · </span>
              <span className="font-mono">{campaign.id}</span>
              {campaign.paidAt ? (
                <>
                  <span> · </span>
                  <span>{t('paidAt', { when: campaign.paidAt })}</span>
                </>
              ) : null}
            </p>
          </Stack>

          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="flex min-w-0 items-end gap-2">
              <span className="font-mono text-[40px] font-bold leading-none tracking-tight text-[var(--color-text)]">
                {campaign.progress.applied}
              </span>
              <span className="font-mono text-[18px] text-[var(--color-text-mute)]">
                / {campaign.progress.quota}
              </span>
              <span className="ml-auto font-mono text-[16px] font-bold text-[var(--color-accent)]">
                {pct}%
              </span>
            </div>
            <ProgressBar
              value={campaign.progress.applied}
              max={campaign.progress.quota}
              tone={campaign.status === 'completed' ? 'success' : 'accent'}
              glow={isLive}
              className="mt-3"
            />
            <div className="mt-2 flex min-w-0 items-center justify-between text-[12px] text-[var(--color-text-dim)]">
              <span>{t('status.appliedSent')}</span>
              {isLive ? (
                <span className="flex min-w-0 items-center gap-1.5 text-[var(--color-accent)]">
                  <span className="inline-block size-1.5 animate-pulse-slow rounded-full bg-[var(--color-accent)]" />
                  {t('liveSearch')}
                </span>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <StatCard
              label={t('metric.found')}
              value={campaign.progress.found}
              hint={t('metric.foundHint')}
            />
            <StatCard
              label={t('metric.responses')}
              value={responses}
              hint={t('metric.responsesHint')}
            />
          </div>
        </Stack>

        <Section title={<SectionTitle>{t('section.events')}</SectionTitle>} className="py-2">
          {events.length === 0 ? (
            <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] px-3 py-6 text-center text-[13px] text-[var(--color-text-mute)]">
              {t('empty')}
            </p>
          ) : (
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2">
              {events.map((e, i) => (
                <TimelineItem
                  key={`${e.t}-${e.text}`}
                  time={e.t}
                  text={e.text}
                  kind={e.kind}
                  isLast={i === events.length - 1}
                />
              ))}
            </div>
          )}
        </Section>

        <Section title={<SectionTitle>{t('section.snapshot')}</SectionTitle>} className="py-2">
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
            {snapshot.map(([key, value], i) => (
              <div
                key={key}
                className={`flex min-w-0 items-baseline justify-between gap-3 px-4 py-2.5 font-mono text-[12px] ${
                  i < snapshot.length - 1 ? 'border-b border-[var(--color-border)]' : ''
                }`}
              >
                <span className="shrink-0 text-[var(--color-text-mute)]">{key}</span>
                <span className="min-w-0 truncate text-right text-[var(--color-text)]">
                  {value}
                </span>
              </div>
            ))}
          </div>
        </Section>
      </Scroll>
    </Screen>
  );
}
