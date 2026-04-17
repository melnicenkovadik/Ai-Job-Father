'use client';

import { FieldGroup, Row, Section, Stack } from '@/components/ui/layout';
import { useTranslations } from 'next-intl';
import { useId } from 'react';
import { type ExperienceDraft, type ProfileDraft, draftId } from './types';

interface ExperienceSectionProps {
  draft: ProfileDraft;
  patch<K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]): void;
}

const INPUT_CLASS =
  'min-h-[2.75rem] w-full min-w-0 rounded-md border border-[color:var(--color-hint,#999)]/30 bg-[var(--color-bg)] px-3 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-link,#2481CC)]';

const TEXTAREA_CLASS = `${INPUT_CLASS} min-h-[6rem] py-2`;

export function ExperienceSection({ draft, patch }: ExperienceSectionProps) {
  const t = useTranslations('profile');

  function add() {
    const today = new Date();
    const iso = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}`;
    patch('experience', [
      ...draft.experience,
      {
        id: draftId('x'),
        company: '',
        role: '',
        startMonth: iso,
        endMonth: null,
        description: '',
        stack: [],
      },
    ]);
  }

  function update(id: string, next: Partial<ExperienceDraft>) {
    patch(
      'experience',
      draft.experience.map((e) => (e.id === id ? { ...e, ...next } : e)),
    );
  }

  function remove(id: string) {
    patch(
      'experience',
      draft.experience.filter((e) => e.id !== id),
    );
  }

  return (
    <Section title={`💼 ${t('section.experienceInner')}`}>
      {draft.experience.length === 0 ? (
        <p className="text-xs opacity-60">{t('empty.noExperience')}</p>
      ) : (
        draft.experience.map((entry, idx) => (
          <ExperienceCard
            key={entry.id}
            entry={entry}
            defaultOpen={idx === 0 && draft.experience.length === 1}
            onChange={(next) => update(entry.id, next)}
            onRemove={() => remove(entry.id)}
          />
        ))
      )}
      <button
        type="button"
        onClick={add}
        className="min-h-[2.75rem] w-full rounded-md border border-dashed border-[color:var(--color-hint,#999)]/40 bg-transparent px-4 text-sm"
      >
        + {t('actions.addExperience')}
      </button>
    </Section>
  );
}

function ExperienceCard({
  entry,
  defaultOpen,
  onChange,
  onRemove,
}: {
  entry: ExperienceDraft;
  defaultOpen: boolean;
  onChange(next: Partial<ExperienceDraft>): void;
  onRemove(): void;
}) {
  const t = useTranslations('profile');
  const companyId = useId();
  const roleId = useId();
  const startId = useId();
  const endId = useId();
  const descId = useId();
  const stackId = useId();

  const summaryText = formatSummary(entry, t('field.present'));
  const isPresent = entry.endMonth === null;

  return (
    <details
      open={defaultOpen || shouldAutoOpen(entry)}
      className="min-w-0 rounded-lg border border-[color:var(--color-hint,#999)]/30 bg-[var(--color-bg)]"
    >
      <summary className="flex min-h-[2.75rem] cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm [overflow-wrap:anywhere]">
        <span className="truncate">{summaryText}</span>
        <span className="shrink-0 opacity-60">▾</span>
      </summary>
      <Stack gap={2} className="border-t border-[color:var(--color-hint,#999)]/20 p-3">
        <FieldGroup id={companyId} label={t('field.company')}>
          <input
            id={companyId}
            type="text"
            value={entry.company}
            onChange={(e) => onChange({ company: e.currentTarget.value.slice(0, 120) })}
            maxLength={120}
            className={INPUT_CLASS}
          />
        </FieldGroup>
        <FieldGroup id={roleId} label={t('field.role')}>
          <input
            id={roleId}
            type="text"
            value={entry.role}
            onChange={(e) => onChange({ role: e.currentTarget.value.slice(0, 120) })}
            maxLength={120}
            className={INPUT_CLASS}
          />
        </FieldGroup>
        <Row gap={2}>
          <FieldGroup id={startId} label={t('field.startMonth')} className="flex-1">
            <input
              id={startId}
              type="month"
              value={entry.startMonth}
              onChange={(e) => onChange({ startMonth: e.currentTarget.value })}
              className={INPUT_CLASS}
            />
          </FieldGroup>
          <FieldGroup id={endId} label={t('field.endMonth')} className="flex-1">
            <input
              id={endId}
              type="month"
              value={entry.endMonth ?? ''}
              onChange={(e) =>
                onChange({ endMonth: e.currentTarget.value ? e.currentTarget.value : null })
              }
              disabled={isPresent}
              className={INPUT_CLASS}
            />
          </FieldGroup>
        </Row>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={isPresent}
            onChange={(e) =>
              onChange({
                endMonth: e.currentTarget.checked ? null : todayMonth(),
              })
            }
          />
          {t('field.present')}
        </label>
        <FieldGroup id={descId} label={t('field.description')}>
          <textarea
            id={descId}
            value={entry.description}
            onChange={(e) => onChange({ description: e.currentTarget.value })}
            maxLength={2000}
            rows={3}
            className={TEXTAREA_CLASS}
          />
        </FieldGroup>
        <FieldGroup id={stackId} label={t('field.stack')}>
          <input
            id={stackId}
            type="text"
            value={entry.stack.join(', ')}
            onChange={(e) =>
              onChange({
                stack: e.currentTarget.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .slice(0, 30),
              })
            }
            placeholder="React, TypeScript, PostgreSQL"
            className={INPUT_CLASS}
          />
        </FieldGroup>
        <Row gap={2} justify="end">
          <button
            type="button"
            onClick={onRemove}
            className="min-h-[2.75rem] rounded-md border border-red-500/50 px-3 text-sm text-red-600 dark:text-red-400"
          >
            🗑
          </button>
        </Row>
      </Stack>
    </details>
  );
}

function formatSummary(entry: ExperienceDraft, presentLabel: string): string {
  const parts: string[] = [];
  if (entry.company) parts.push(entry.company);
  if (entry.role) parts.push(entry.role);
  const dateRange =
    entry.startMonth && (entry.endMonth || entry.endMonth === null)
      ? `${entry.startMonth} — ${entry.endMonth ?? presentLabel}`
      : '';
  if (dateRange) parts.push(dateRange);
  return parts.length === 0 ? 'New entry' : parts.join(' · ');
}

function shouldAutoOpen(entry: ExperienceDraft): boolean {
  return entry.company.trim().length === 0 && entry.role.trim().length === 0;
}

function todayMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
