'use client';

import { FieldGroup, Row, Section, Stack } from '@/components/ui/layout';
import { useTranslations } from 'next-intl';
import { useId } from 'react';
import { type EducationDraft, type ProfileDraft, draftId } from './types';

interface EducationSectionProps {
  draft: ProfileDraft;
  patch<K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]): void;
}

const INPUT_CLASS =
  'min-h-[2.75rem] w-full min-w-0 rounded-md border border-[color:var(--color-hint,#999)]/30 bg-[var(--color-bg)] px-3 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-link,#2481CC)]';

export function EducationSection({ draft, patch }: EducationSectionProps) {
  const t = useTranslations('profile');

  function add() {
    patch('education', [
      ...draft.education,
      { id: draftId('e'), school: '', degree: '', startMonth: '', endMonth: '' },
    ]);
  }

  function update(id: string, next: Partial<EducationDraft>) {
    patch(
      'education',
      draft.education.map((e) => (e.id === id ? { ...e, ...next } : e)),
    );
  }

  function remove(id: string) {
    patch(
      'education',
      draft.education.filter((e) => e.id !== id),
    );
  }

  return (
    <Section title={`🎓 ${t('section.educationInner')}`}>
      {draft.education.length === 0 ? (
        <p className="text-xs opacity-60">{t('empty.noEducation')}</p>
      ) : (
        draft.education.map((entry) => (
          <EducationCard
            key={entry.id}
            entry={entry}
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
        + {t('actions.addEducation')}
      </button>
    </Section>
  );
}

function EducationCard({
  entry,
  onChange,
  onRemove,
}: {
  entry: EducationDraft;
  onChange(next: Partial<EducationDraft>): void;
  onRemove(): void;
}) {
  const t = useTranslations('profile');
  const schoolId = useId();
  const degreeId = useId();
  const startId = useId();
  const endId = useId();
  const summaryText = formatSummary(entry);

  return (
    <details
      open={entry.school.trim().length === 0}
      className="min-w-0 rounded-lg border border-[color:var(--color-hint,#999)]/30 bg-[var(--color-bg)]"
    >
      <summary className="flex min-h-[2.75rem] cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm [overflow-wrap:anywhere]">
        <span className="truncate">{summaryText}</span>
        <span className="shrink-0 opacity-60">▾</span>
      </summary>
      <Stack gap={2} className="border-t border-[color:var(--color-hint,#999)]/20 p-3">
        <FieldGroup id={schoolId} label={t('field.school')}>
          <input
            id={schoolId}
            type="text"
            value={entry.school}
            onChange={(e) => onChange({ school: e.currentTarget.value.slice(0, 120) })}
            maxLength={120}
            className={INPUT_CLASS}
          />
        </FieldGroup>
        <FieldGroup id={degreeId} label={t('field.degree')}>
          <input
            id={degreeId}
            type="text"
            value={entry.degree}
            onChange={(e) => onChange({ degree: e.currentTarget.value.slice(0, 120) })}
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
              value={entry.endMonth}
              onChange={(e) => onChange({ endMonth: e.currentTarget.value })}
              className={INPUT_CLASS}
            />
          </FieldGroup>
        </Row>
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

function formatSummary(entry: EducationDraft): string {
  const parts: string[] = [];
  if (entry.school) parts.push(entry.school);
  if (entry.degree) parts.push(entry.degree);
  const dateRange =
    entry.startMonth || entry.endMonth
      ? `${entry.startMonth || '?'} — ${entry.endMonth || '?'}`
      : '';
  if (dateRange) parts.push(dateRange);
  return parts.length === 0 ? 'New entry' : parts.join(' · ');
}
