'use client';

import { Icon } from '@/components/icons';
import { Stack } from '@/components/ui/layout';
import { useMockStore } from '@/lib/mocks/store';
import { useTranslations } from 'next-intl';

const ALL_STACK = [
  'React',
  'TypeScript',
  'Next.js',
  'Node.js',
  'Vue',
  'Python',
  'GraphQL',
  'PostgreSQL',
  'Docker',
  'AWS',
  'Tailwind',
  'Go',
  'Rust',
];

export function StepStack() {
  const t = useTranslations('screens.wizard.stack');
  const { stack, patchDraft } = useMockStore((s) => ({
    stack: s.wizard.draft.stack,
    patchDraft: s.patchDraft,
  }));

  const toggle = (item: string) => {
    if (stack.includes(item)) {
      patchDraft({ stack: stack.filter((x) => x !== item) });
    } else {
      patchDraft({ stack: [...stack, item] });
    }
  };

  return (
    <Stack gap={3}>
      <p className="text-[12px] text-[var(--color-text-dim)]">{t('hint')}</p>
      <div className="flex min-w-0 flex-wrap gap-1.5">
        {ALL_STACK.map((s) => {
          const on = stack.includes(s);
          return (
            <button
              key={s}
              type="button"
              onClick={() => toggle(s)}
              className={`inline-flex min-h-[2.25rem] min-w-0 items-center gap-1.5 rounded-[var(--radius-full)] border px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                on
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-ink)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]'
              }`}
            >
              {on ? <Icon.Star size={11} className="fill-current" /> : null}
              <span className="min-w-0 truncate">{s}</span>
            </button>
          );
        })}
      </div>
      <p className="text-[12px] text-[var(--color-text-dim)]">
        {t('selected', { count: stack.length })}
      </p>
    </Stack>
  );
}
