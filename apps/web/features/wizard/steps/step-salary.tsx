'use client';

import { Stack } from '@/components/ui/layout';
import { currencyForCountries, fromUsd } from '@/features/wizard/data/currency-rates';
import { type ExperienceLevel, useWizardDraft } from '@/features/wizard/draft-store';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

const MIN = 400;
const MAX = 15_000;
const STEP = 100;

const LEVEL_PRESETS: Record<ExperienceLevel, { min: number; max: number }> = {
  junior: { min: 400, max: 1500 },
  mid: { min: 1500, max: 4000 },
  senior: { min: 4000, max: 8000 },
  lead: { min: 8000, max: 15_000 },
};

const LEVELS: ExperienceLevel[] = ['junior', 'mid', 'senior', 'lead'];

function clamp(value: number): number {
  return Math.max(MIN, Math.min(MAX, value));
}

export function StepSalary() {
  const t = useTranslations('screens.wizard.salary');
  const { salaryMin, salaryMax, experienceLevel, countries, patchDraft } = useWizardDraft((s) => ({
    salaryMin: s.draft.salaryMin,
    salaryMax: s.draft.salaryMax,
    experienceLevel: s.draft.experienceLevel,
    countries: s.draft.countries,
    patchDraft: s.patchDraft,
  }));

  // Hydrate sensible defaults the first time the user lands on this step,
  // so the slider has thumbs in valid positions even before any interaction.
  useEffect(() => {
    if (salaryMin === undefined || salaryMax === undefined) {
      const preset = experienceLevel ? LEVEL_PRESETS[experienceLevel] : LEVEL_PRESETS.mid;
      patchDraft({
        salaryMin: preset.min,
        salaryMax: preset.max,
        experienceLevel: experienceLevel ?? 'mid',
      });
    }
  }, [salaryMin, salaryMax, experienceLevel, patchDraft]);

  const min = salaryMin ?? LEVEL_PRESETS.mid.min;
  const max = salaryMax ?? LEVEL_PRESETS.mid.max;
  const currency = currencyForCountries(countries);

  const setLevel = (lvl: ExperienceLevel) => {
    const preset = LEVEL_PRESETS[lvl];
    patchDraft({ experienceLevel: lvl, salaryMin: preset.min, salaryMax: preset.max });
  };

  const setMin = (next: number) => {
    const v = clamp(next);
    patchDraft({ salaryMin: Math.min(v, max - STEP) });
  };
  const setMax = (next: number) => {
    const v = clamp(next);
    patchDraft({ salaryMax: Math.max(v, min + STEP) });
  };

  const fmtUsd = (v: number) => `$${v.toLocaleString('en-US')}`;
  const fmtLocal = (v: number) =>
    currency.code === 'USD'
      ? null
      : `${currency.symbol}${fromUsd(v, currency).toLocaleString('en-US')}`;

  return (
    <Stack gap={4}>
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-6 text-center">
        <p className="mb-2 text-[11px] uppercase tracking-wider text-[var(--color-text-dim)]">
          {t('label')}
        </p>
        <p className="font-mono text-[28px] font-bold leading-tight tracking-tight text-[var(--color-text)]">
          {fmtUsd(min)} – {fmtUsd(max)}
        </p>
        {currency.code !== 'USD' ? (
          <p className="mt-1 font-mono text-[12px] text-[var(--color-text-mute)]">
            ≈ {fmtLocal(min)} – {fmtLocal(max)} {currency.code}
          </p>
        ) : null}
      </div>

      <Stack gap={2}>
        <p className="text-[11px] uppercase tracking-wider text-[var(--color-text-dim)]">
          {t('levelLabel')}
        </p>
        <div className="flex min-w-0 flex-wrap gap-1.5">
          {LEVELS.map((lvl) => {
            const on = experienceLevel === lvl;
            return (
              <button
                key={lvl}
                type="button"
                onClick={() => setLevel(lvl)}
                className={`inline-flex min-h-[2.25rem] flex-1 items-center justify-center rounded-[var(--radius-full)] border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                  on
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-ink)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]'
                }`}
              >
                {t(`level.${lvl}`)}
              </button>
            );
          })}
        </div>
      </Stack>

      <Stack gap={3}>
        <Stack gap={1}>
          <label
            htmlFor="salary-min-range"
            className="text-[11px] uppercase tracking-wider text-[var(--color-text-dim)]"
          >
            {t('minLabel')} · {fmtUsd(min)}
          </label>
          <input
            id="salary-min-range"
            type="range"
            min={MIN}
            max={MAX}
            step={STEP}
            value={min}
            onChange={(e) => setMin(Number(e.target.value))}
            className="w-full accent-[var(--color-accent)]"
            aria-label={t('minLabel')}
          />
        </Stack>
        <Stack gap={1}>
          <label
            htmlFor="salary-max-range"
            className="text-[11px] uppercase tracking-wider text-[var(--color-text-dim)]"
          >
            {t('maxLabel')} · {fmtUsd(max)}
          </label>
          <input
            id="salary-max-range"
            type="range"
            min={MIN}
            max={MAX}
            step={STEP}
            value={max}
            onChange={(e) => setMax(Number(e.target.value))}
            className="w-full accent-[var(--color-accent)]"
            aria-label={t('maxLabel')}
          />
        </Stack>
        <div className="flex min-w-0 items-center justify-between font-mono text-[11px] text-[var(--color-text-mute)]">
          <span>{fmtUsd(MIN)}</span>
          <span>{fmtUsd(MAX)}</span>
        </div>
      </Stack>
    </Stack>
  );
}
