'use client';

import { Icon } from '@/components/icons';
import { Pill, SectionTitle } from '@/components/ui';
import { Stack } from '@/components/ui/layout';
import { useMockStore } from '@/lib/mocks/store';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

const SUGGESTIONS = [
  'Senior Frontend Developer',
  'Full-stack Engineer',
  'React Native Developer',
  'Backend Engineer',
  'Mobile Engineer',
];

const MAX_ROLES = 5;

export function StepRoles() {
  const t = useTranslations('screens.wizard.roles');
  const { roles, patchDraft } = useMockStore((s) => ({
    roles: s.wizard.draft.roles,
    patchDraft: s.patchDraft,
  }));
  const [input, setInput] = useState('');

  const add = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || roles.includes(trimmed) || roles.length >= MAX_ROLES) return;
    patchDraft({ roles: [...roles, trimmed] });
    setInput('');
  };

  const remove = (value: string) => {
    patchDraft({ roles: roles.filter((r) => r !== value) });
  };

  const remaining = SUGGESTIONS.filter((s) => !roles.includes(s));

  return (
    <Stack gap={4}>
      <div className="flex min-w-0 items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5">
        <Icon.Search size={18} className="shrink-0 text-[var(--color-text-dim)]" />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add(input);
            }
          }}
          placeholder={t('placeholder')}
          className="min-w-0 flex-1 bg-transparent text-[14px] text-[var(--color-text)] placeholder:text-[var(--color-text-mute)] focus:outline-none"
        />
        {input.trim() && roles.length < MAX_ROLES ? (
          <button
            type="button"
            onClick={() => add(input)}
            className="shrink-0 rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-2.5 py-1 text-[12px] font-semibold text-[var(--color-accent-ink)]"
          >
            {t('add')}
          </button>
        ) : null}
      </div>

      <Stack gap={2}>
        <p className="text-[12px] text-[var(--color-text-dim)]">
          {t('selected', { count: roles.length })}
        </p>
        {roles.length === 0 ? (
          <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] px-3 py-3 text-[13px] text-[var(--color-text-mute)]">
            {t('empty')}
          </p>
        ) : (
          <div className="flex min-w-0 flex-wrap gap-1.5">
            {roles.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => remove(r)}
                className="inline-flex min-h-[2rem] items-center gap-1.5 rounded-[var(--radius-full)] bg-[var(--color-accent-bg)] px-3 py-1 text-[13px] font-semibold text-[var(--color-accent)]"
              >
                {r}
                <Icon.Close size={12} />
              </button>
            ))}
          </div>
        )}
      </Stack>

      {remaining.length > 0 ? (
        <Stack gap={2}>
          <SectionTitle>{t('suggestions')}</SectionTitle>
          <Stack gap={1}>
            {remaining.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => add(s)}
                disabled={roles.length >= MAX_ROLES}
                className="flex min-h-[2.5rem] min-w-0 items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-left text-[13px] text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-hi)] disabled:opacity-40"
              >
                <span className="min-w-0 truncate">{s}</span>
                <Icon.Plus size={14} className="shrink-0 text-[var(--color-text-mute)]" />
              </button>
            ))}
          </Stack>
        </Stack>
      ) : null}

      <div className="flex flex-wrap items-center justify-end">
        <Pill variant="soft">{`${roles.length}/${MAX_ROLES}`}</Pill>
      </div>
    </Stack>
  );
}
