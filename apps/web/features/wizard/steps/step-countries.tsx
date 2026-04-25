'use client';

import { Pill } from '@/components/ui';
import { Stack } from '@/components/ui/layout';
import { useMockStore } from '@/lib/mocks/store';
import { useTranslations } from 'next-intl';

const QUICK = ['Any EU', 'Any Remote', 'DE', 'NL', 'PL', 'UK', 'US', 'UA', 'CZ', 'ES', 'FR', 'IT'];

export function StepCountries() {
  const t = useTranslations('screens.wizard.countries');
  const { countries, patchDraft } = useMockStore((s) => ({
    countries: s.wizard.draft.countries,
    patchDraft: s.patchDraft,
  }));

  const toggle = (code: string) => {
    if (countries.includes(code)) {
      patchDraft({ countries: countries.filter((c) => c !== code) });
    } else {
      patchDraft({ countries: [...countries, code] });
    }
  };

  return (
    <Stack gap={3}>
      <div className="flex min-w-0 flex-wrap gap-1.5">
        {QUICK.map((c) => (
          <Pill
            key={c}
            asButton
            selected={countries.includes(c)}
            onSelect={() => toggle(c)}
            className="min-h-[2.25rem] px-3 text-[13px] font-semibold"
          >
            {c}
          </Pill>
        ))}
      </div>

      {countries.length === 0 ? (
        <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] px-3 py-3 text-[13px] text-[var(--color-text-mute)]">
          {t('empty')}
        </p>
      ) : (
        <p className="text-[12px] text-[var(--color-text-dim)]">
          {t('selected', { count: countries.length })}
        </p>
      )}
    </Stack>
  );
}
