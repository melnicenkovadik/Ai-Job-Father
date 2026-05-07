'use client';

import { Icon } from '@/components/icons';
import { useTelegramBackButton } from '@/components/telegram/use-back-button';
import { BottomTabBar, Headline, Spinner, StatusBadge } from '@/components/ui';
import { Screen, Scroll, Stack } from '@/components/ui/layout';
import {
  type CampaignDto,
  isCampaignActive,
  useCampaignsQuery,
} from '@/features/campaigns/use-campaigns';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

type Filter = 'all' | 'active' | 'past';

export function CampaignsListScreen() {
  const t = useTranslations('screens.campaigns');
  const router = useRouter();
  const { data: list = [], isLoading } = useCampaignsQuery();
  const [filter, setFilter] = useState<Filter>('all');

  useTelegramBackButton('/');

  const filtered = useMemo(() => {
    if (filter === 'all') return list;
    if (filter === 'active') return list.filter(isCampaignActive);
    return list.filter((c) => !isCampaignActive(c));
  }, [list, filter]);

  return (
    <Screen reserveMainButton={false} className="pb-[5.5rem]">
      <Scroll className="flex-1">
        <Stack gap={3} className="px-4 pb-4 pt-6">
          <Stack gap={1}>
            <div className="flex min-w-0 items-start justify-between gap-3">
              <Headline size="md">{t('title')}</Headline>
              <button
                type="button"
                onClick={() => router.push('/campaign/new')}
                className="inline-flex min-h-[2.25rem] shrink-0 items-center gap-1.5 rounded-[var(--radius-full)] bg-[var(--color-accent)] px-3 py-1.5 text-[13px] font-semibold text-[var(--color-accent-ink)] transition-opacity hover:opacity-90"
              >
                <Icon.Plus size={14} />
                <span>{t('newCampaign')}</span>
              </button>
            </div>
            <p className="text-[13px] text-[var(--color-text-dim)]">{t('subtitle')}</p>
          </Stack>

          <div className="flex min-w-0 gap-2">
            <FilterPill
              label={t('filter.all')}
              active={filter === 'all'}
              onClick={() => setFilter('all')}
              count={list.length}
            />
            <FilterPill
              label={t('filter.active')}
              active={filter === 'active'}
              onClick={() => setFilter('active')}
              count={list.filter(isCampaignActive).length}
            />
            <FilterPill
              label={t('filter.past')}
              active={filter === 'past'}
              onClick={() => setFilter('past')}
              count={list.filter((c) => !isCampaignActive(c)).length}
            />
          </div>

          {isLoading ? (
            <Stack gap={2} className="items-center px-6 py-10 text-center">
              <Spinner size={20} />
              <p className="text-[13px] text-[var(--color-text-dim)]">{t('loading')}</p>
            </Stack>
          ) : null}
          {!isLoading && filtered.length === 0 ? (
            <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] px-3 py-6 text-center text-[13px] text-[var(--color-text-mute)]">
              {filter === 'all' ? t('empty') : t('emptyFilter')}
            </p>
          ) : null}
          {filtered.length > 0 ? (
            <Stack gap={2}>
              {filtered.map((c) => (
                <CampaignCard
                  key={c.id}
                  campaign={c}
                  onOpen={() => router.push(`/campaign/${c.id}`)}
                  countriesLabel={t('countriesCount', { count: c.countries.length })}
                  progressLabel={t('progress', {
                    found: c.progress.found,
                    applied: c.progress.applied,
                  })}
                />
              ))}
            </Stack>
          ) : null}
        </Stack>
      </Scroll>

      <BottomTabBar />
    </Screen>
  );
}

function FilterPill({
  label,
  active,
  onClick,
  count,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex min-h-[2rem] min-w-0 shrink-0 items-center gap-1.5 rounded-[var(--radius-full)] border px-3 py-1 text-[12px] font-medium transition-colors ${
        active
          ? 'border-[var(--color-accent)] bg-[var(--color-accent-bg)] text-[var(--color-accent)]'
          : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-dim)] hover:bg-[var(--color-surface-hi)]'
      }`}
    >
      <span>{label}</span>
      <span className="font-mono text-[10px] opacity-70">{count}</span>
    </button>
  );
}

function CampaignCard({
  campaign,
  onOpen,
  countriesLabel,
  progressLabel,
}: {
  campaign: CampaignDto;
  onOpen: () => void;
  countriesLabel: string;
  progressLabel: string;
}) {
  const created = new Date(campaign.createdAt);
  const dateLabel = created.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full min-w-0 flex-col rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-left transition-colors hover:bg-[var(--color-surface-hi)]"
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <span className="min-w-0 truncate text-[15px] font-semibold text-[var(--color-text)]">
          {campaign.title}
        </span>
        <StatusBadge status={campaign.status} className="shrink-0" />
      </div>
      <div className="mt-2 flex min-w-0 items-center gap-3 text-[12px] text-[var(--color-text-dim)]">
        <span>{countriesLabel}</span>
        <span aria-hidden>·</span>
        <span className="font-mono">{progressLabel}</span>
        <span aria-hidden>·</span>
        <span>{dateLabel}</span>
      </div>
    </button>
  );
}
