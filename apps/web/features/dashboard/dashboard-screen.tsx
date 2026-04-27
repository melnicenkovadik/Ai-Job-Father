'use client';

import { Icon } from '@/components/icons';
import {
  BottomTabBar,
  CategoryChip,
  Fab,
  Headline,
  ProgressBar,
  SectionTitle,
  StatCard,
  StatusBadge,
} from '@/components/ui';
import { Screen, Scroll, Section, Stack } from '@/components/ui/layout';
import { useMockStore } from '@/lib/mocks/store';
import type { Campaign, CampaignStatus } from '@/lib/mocks/types';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useShallow } from 'zustand/shallow';

const ACTIVE_STATUSES: readonly CampaignStatus[] = ['searching', 'applying', 'running', 'paid'];

interface DashboardScreenProps {
  greetingName: string;
}

export function DashboardScreen({ greetingName }: DashboardScreenProps) {
  const t = useTranslations('screens.dashboard');
  const { campaigns, campaignOrder } = useMockStore(
    useShallow((s) => ({
      campaigns: s.campaigns,
      campaignOrder: s.campaignOrder,
    })),
  );

  const list = campaignOrder.map((id) => campaigns[id]).filter((c): c is Campaign => Boolean(c));
  const active = list.filter((c) => ACTIVE_STATUSES.includes(c.status));
  const drafts = list.filter((c) => c.status === 'draft');
  const completed = list.filter((c) => c.status === 'completed');

  const totals = list.reduce(
    (acc, c) => {
      acc.found += c.progress.found;
      acc.applied += c.progress.applied;
      return acc;
    },
    { found: 0, applied: 0 },
  );
  const responses = Math.floor(totals.applied * 0.14);

  return (
    <Screen reserveMainButton={false} className="pb-[5.5rem]">
      <Scroll className="flex-1">
        <Stack gap={0} className="px-4 pb-4 pt-6">
          <p className="text-[14px] text-[var(--color-text-dim)]">
            {t('greeting', { name: greetingName })}
          </p>
          <Headline size="md" className="mt-1">
            {t('summary', { count: list.length })}
          </Headline>
        </Stack>

        <div className="grid grid-cols-3 gap-2 px-4 pb-6">
          <StatCard label={t('stats.found')} value={totals.found} hint={t('stats.foundHint')} />
          <StatCard
            label={t('stats.applied')}
            value={totals.applied}
            hint={t('stats.appliedHint')}
          />
          <StatCard
            label={t('stats.responses')}
            value={responses}
            hint={t('stats.responsesHint')}
          />
        </div>

        {active.length > 0 ? <CampaignList title={t('section.active')} items={active} /> : null}
        {drafts.length > 0 ? (
          <CampaignList title={t('section.drafts')} items={drafts} variant="checkout" />
        ) : null}
        {completed.length > 0 ? (
          <CampaignList title={t('section.completed')} items={completed} />
        ) : null}

        {list.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-[16px] font-semibold text-[var(--color-text)]">{t('empty.title')}</p>
            <p className="mt-1 text-[14px] text-[var(--color-text-dim)]">{t('empty.hint')}</p>
          </div>
        ) : null}
      </Scroll>

      <Link href="/campaign/new" className="contents">
        <Fab label={t('newCampaign')} icon={<Icon.Plus size={26} />} />
      </Link>
      <BottomTabBar />
    </Screen>
  );
}

function CampaignList({
  title,
  items,
  variant = 'detail',
}: {
  title: string;
  items: Campaign[];
  variant?: 'detail' | 'checkout';
}) {
  return (
    <Section title={<SectionTitle>{title}</SectionTitle>} className="py-4">
      <Stack gap={2}>
        {items.map((c) => (
          <CampaignCard
            key={c.id}
            c={c}
            href={variant === 'checkout' ? `/campaign/${c.id}/checkout` : `/campaign/${c.id}`}
          />
        ))}
      </Stack>
    </Section>
  );
}

function CampaignCard({ c, href }: { c: Campaign; href: string }) {
  const pct = c.progress.quota ? Math.round((c.progress.applied / c.progress.quota) * 100) : 0;
  return (
    <Link
      href={href}
      className="flex min-w-0 flex-col gap-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 transition-colors hover:bg-[var(--color-surface-hi)]"
    >
      <div className="flex min-w-0 items-center gap-3">
        <CategoryChip category={c.category} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold text-[var(--color-text)]">
            {c.title}
          </div>
          <div className="mt-0.5 truncate text-[12px] text-[var(--color-text-dim)]">
            {c.countries.join(', ')} · {c.createdAt}
          </div>
        </div>
        <StatusBadge status={c.status} />
      </div>
      {c.status !== 'draft' ? (
        <div className="flex min-w-0 items-center gap-3">
          <ProgressBar
            value={c.progress.applied}
            max={c.progress.quota}
            tone={c.status === 'completed' ? 'success' : 'accent'}
            glow={c.status === 'searching' || c.status === 'applying'}
            className="flex-1"
          />
          <span className="shrink-0 font-mono text-[12px] text-[var(--color-text-dim)]">
            {c.progress.applied}/{c.progress.quota}
            <span className="ml-1 text-[var(--color-text-mute)]">· {pct}%</span>
          </span>
        </div>
      ) : null}
    </Link>
  );
}
