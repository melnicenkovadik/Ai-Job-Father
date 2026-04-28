'use client';

import { Icon } from '@/components/icons';
import { LanguageTile, SectionTitle } from '@/components/ui';
import { Stack } from '@/components/ui/layout';
import { LANGUAGES, primaryLanguageFor } from '@/features/wizard/data/languages';
import { useWizardDraft } from '@/features/wizard/draft-store';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

export function StepLanguages() {
  const t = useTranslations('screens.wizard.langs');
  const { languages, countries, patchDraft } = useWizardDraft((s) => ({
    languages: s.draft.languages,
    countries: s.draft.countries,
    patchDraft: s.patchDraft,
  }));

  const primary = useMemo(() => primaryLanguageFor(countries), [countries]);

  const toggle = (code: string) => {
    if (languages.includes(code)) {
      patchDraft({ languages: languages.filter((x) => x !== code) });
    } else {
      patchDraft({ languages: [...languages, code] });
    }
  };

  const primaryEntry = primary ? LANGUAGES.find((l) => l.code === primary) : undefined;
  const restEntries = primaryEntry
    ? LANGUAGES.filter((l) => l.code !== primaryEntry.code)
    : LANGUAGES;

  const showError = languages.length === 0;

  return (
    <Stack gap={4}>
      {primaryEntry ? (
        <Stack gap={2}>
          <SectionTitle>
            <span className="inline-flex items-center gap-1.5">
              <Icon.Spark size={12} className="fill-current text-[var(--color-accent)]" />
              {t('primaryFor', { country: countries[0] ?? '' })}
            </span>
          </SectionTitle>
          <div className="rounded-[var(--radius-md)] ring-1 ring-[var(--color-accent)]/40">
            <LanguageTile
              code={primaryEntry.code}
              label={primaryEntry.native}
              selected={languages.includes(primaryEntry.code)}
              onSelect={() => toggle(primaryEntry.code)}
            />
          </div>
        </Stack>
      ) : null}

      <Stack gap={2}>
        {primaryEntry ? <SectionTitle>{t('others')}</SectionTitle> : null}
        <Stack gap={2}>
          {restEntries.map((lang) => (
            <LanguageTile
              key={lang.code}
              code={lang.code}
              label={`${lang.native} · ${lang.english}`}
              selected={languages.includes(lang.code)}
              onSelect={() => toggle(lang.code)}
            />
          ))}
        </Stack>
      </Stack>

      <p
        className={`text-[12px] ${
          showError ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-dim)]'
        }`}
      >
        {showError ? t('errorPickAtLeastOne') : t('selectedCount', { count: languages.length })}
      </p>
    </Stack>
  );
}
