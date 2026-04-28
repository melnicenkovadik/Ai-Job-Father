'use client';

import { Icon } from '@/components/icons';
import { Pill, SectionTitle } from '@/components/ui';
import { Stack } from '@/components/ui/layout';
import {
  COUNTRIES,
  type CountryEntry,
  type CountrySection,
  filterCountries,
  flagFor,
} from '@/features/wizard/data/countries';
import { useWizardDraft } from '@/features/wizard/draft-store';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

const SECTION_ORDER: CountrySection[] = ['quick', 'europe', 'cis', 'anglo', 'other'];

export function StepCountries() {
  const t = useTranslations('screens.wizard.countries');
  const { countries, patchDraft } = useWizardDraft((s) => ({
    countries: s.draft.countries,
    patchDraft: s.patchDraft,
  }));
  const [query, setQuery] = useState('');

  const toggle = (code: string) => {
    if (countries.includes(code)) {
      patchDraft({ countries: countries.filter((c) => c !== code) });
    } else {
      patchDraft({ countries: [...countries, code] });
    }
  };

  const filtered = useMemo(() => filterCountries(query), [query]);
  const grouped = useMemo(() => {
    const map = new Map<CountrySection, CountryEntry[]>();
    for (const entry of filtered) {
      const list = map.get(entry.section) ?? [];
      list.push(entry);
      map.set(entry.section, list);
    }
    return map;
  }, [filtered]);

  const showError = countries.length === 0;
  const hasResults = filtered.length > 0;

  return (
    <Stack gap={3}>
      <div
        className={`flex min-w-0 items-center gap-2.5 rounded-[var(--radius-md)] border bg-[var(--color-surface)] px-3 py-2.5 ${
          showError ? 'border-[var(--color-danger)]/60' : 'border-[var(--color-border)]'
        }`}
      >
        <Icon.Search size={18} className="shrink-0 text-[var(--color-text-dim)]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="min-w-0 flex-1 bg-transparent text-[14px] text-[var(--color-text)] placeholder:text-[var(--color-text-mute)] focus:outline-none"
          aria-label={t('searchPlaceholder')}
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="shrink-0 text-[var(--color-text-mute)]"
            aria-label={t('clear')}
          >
            <Icon.Close size={14} />
          </button>
        ) : null}
      </div>

      {countries.length > 0 ? (
        <div className="flex min-w-0 flex-wrap gap-1.5">
          {countries.map((code) => {
            const entry = COUNTRIES.find((c) => c.code === code);
            return (
              <button
                key={code}
                type="button"
                onClick={() => toggle(code)}
                className="inline-flex min-h-[2rem] items-center gap-1.5 rounded-[var(--radius-full)] bg-[var(--color-accent-bg)] px-3 py-1 text-[13px] font-semibold text-[var(--color-accent)]"
              >
                <span>{flagFor(code)}</span>
                <span>{entry?.name ?? code}</span>
                <Icon.Close size={12} />
              </button>
            );
          })}
        </div>
      ) : (
        <p
          className={`rounded-[var(--radius-md)] border border-dashed px-3 py-3 text-[13px] ${
            showError
              ? 'border-[var(--color-danger)]/60 text-[var(--color-danger)]'
              : 'border-[var(--color-border)] text-[var(--color-text-mute)]'
          }`}
        >
          {t('empty')}
        </p>
      )}

      {hasResults ? (
        <Stack gap={3}>
          {SECTION_ORDER.map((section) => {
            const items = grouped.get(section);
            if (!items || items.length === 0) return null;
            return (
              <Stack key={section} gap={2}>
                <SectionTitle>{t(`section.${section}`)}</SectionTitle>
                <div className="flex min-w-0 flex-wrap gap-1.5">
                  {items.map((c) => (
                    <Pill
                      key={c.code}
                      asButton
                      selected={countries.includes(c.code)}
                      onSelect={() => toggle(c.code)}
                      className="min-h-[2.25rem] px-3 text-[13px] font-semibold"
                    >
                      <span className="mr-1">{flagFor(c.code)}</span>
                      {c.name}
                    </Pill>
                  ))}
                </div>
              </Stack>
            );
          })}
        </Stack>
      ) : (
        <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] px-3 py-3 text-[13px] text-[var(--color-text-mute)]">
          {t('noResults', { query })}
        </p>
      )}

      {countries.length > 0 ? (
        <p className="text-[12px] text-[var(--color-text-dim)]">
          {t('selected', { count: countries.length })}
        </p>
      ) : null}
    </Stack>
  );
}
