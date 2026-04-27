'use client';

import { CATEGORY_GLYPH } from '@/components/ui';
import { useWizardDraft } from '@/features/wizard/draft-store';
import { JOB_CATEGORIES, type JobCategory } from '@ai-job-bot/core';
import { useTranslations } from 'next-intl';

export function StepCategory() {
  const t = useTranslations('screens.wizard.category');
  const { category, patchDraft } = useWizardDraft((s) => ({
    category: s.draft.category,
    patchDraft: s.patchDraft,
  }));

  return (
    <div className="grid grid-cols-2 gap-2">
      {JOB_CATEGORIES.map((slug) => {
        const selected = category === slug;
        return (
          <button
            key={slug}
            type="button"
            onClick={() => patchDraft({ category: slug as JobCategory })}
            className={`flex min-h-[3.25rem] min-w-0 items-center gap-2.5 rounded-[var(--radius-md)] border px-3 py-3 text-left transition-colors ${
              selected
                ? 'border-[var(--color-accent)] bg-[var(--color-accent-bg)]'
                : 'border-[var(--color-border)] bg-[var(--color-surface)]'
            }`}
          >
            <span
              className={`inline-flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] font-mono text-[15px] font-bold ${
                selected
                  ? 'bg-[var(--color-accent)] text-[var(--color-accent-ink)]'
                  : 'bg-[var(--color-bg-2)] text-[var(--color-text)]'
              }`}
              aria-hidden
            >
              {CATEGORY_GLYPH[slug]}
            </span>
            <span className="min-w-0 truncate text-[13px] font-semibold text-[var(--color-text)]">
              {t(slug)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
