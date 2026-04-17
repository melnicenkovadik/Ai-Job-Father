'use client';

import { FieldGroup, Row, Section } from '@/components/ui/layout';
import { CEFR_LEVELS, type CefrLevel } from '@ai-job-bot/core';
import { useTranslations } from 'next-intl';
import { useId } from 'react';
import type { ProfileDraft } from './types';

interface IdentitySectionProps {
  draft: ProfileDraft;
  patch<K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]): void;
  nameError?: string;
}

const INPUT_CLASS =
  'min-h-[2.75rem] w-full min-w-0 rounded-md border border-[color:var(--color-hint,#999)]/30 bg-[var(--color-bg)] px-3 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-link,#2481CC)]';

const TEXTAREA_CLASS = `${INPUT_CLASS} min-h-[5.5rem] py-2`;

export function IdentitySection({ draft, patch, nameError }: IdentitySectionProps) {
  const t = useTranslations('profile');
  const nameId = useId();
  const fullNameId = useId();
  const headlineId = useId();
  const summaryId = useId();
  const locationId = useId();
  const timezoneId = useId();
  const yearsId = useId();

  return (
    <Section title={`👤 ${t('section.identity')}`}>
      <FieldGroup id={nameId} label={`${t('field.name')} *`} error={nameError}>
        <input
          id={nameId}
          type="text"
          value={draft.name}
          onChange={(e) => patch('name', e.currentTarget.value.slice(0, 40))}
          maxLength={40}
          required
          className={INPUT_CLASS}
        />
      </FieldGroup>

      <FieldGroup id={fullNameId} label={t('field.fullName')}>
        <input
          id={fullNameId}
          type="text"
          value={draft.fullName}
          onChange={(e) => patch('fullName', e.currentTarget.value)}
          maxLength={120}
          className={INPUT_CLASS}
        />
      </FieldGroup>

      <FieldGroup id={headlineId} label={t('field.headline')} hint={t('field.headlineHint')}>
        <input
          id={headlineId}
          type="text"
          value={draft.headline}
          onChange={(e) => patch('headline', e.currentTarget.value)}
          maxLength={120}
          className={INPUT_CLASS}
        />
      </FieldGroup>

      <FieldGroup id={summaryId} label={t('field.summary')}>
        <textarea
          id={summaryId}
          value={draft.summary}
          onChange={(e) => patch('summary', e.currentTarget.value)}
          maxLength={2000}
          rows={3}
          className={TEXTAREA_CLASS}
        />
      </FieldGroup>

      <Row gap={2}>
        <FieldGroup id={locationId} label={t('field.location')} className="flex-1">
          <input
            id={locationId}
            type="text"
            value={draft.location}
            onChange={(e) => patch('location', e.currentTarget.value)}
            maxLength={120}
            className={INPUT_CLASS}
          />
        </FieldGroup>
        <FieldGroup id={timezoneId} label={t('field.timezone')} className="flex-1">
          <input
            id={timezoneId}
            type="text"
            value={draft.timezone}
            onChange={(e) => patch('timezone', e.currentTarget.value)}
            maxLength={60}
            placeholder="Europe/Rome"
            className={INPUT_CLASS}
          />
        </FieldGroup>
      </Row>

      <FieldGroup id={yearsId} label={t('field.yearsTotal')}>
        <input
          id={yearsId}
          type="number"
          inputMode="numeric"
          min={0}
          max={80}
          value={draft.yearsTotal ?? ''}
          onChange={(e) => {
            const raw = e.currentTarget.value;
            if (raw === '') {
              patch('yearsTotal', null);
              return;
            }
            const n = Number.parseInt(raw, 10);
            patch('yearsTotal', Number.isFinite(n) ? Math.min(80, Math.max(0, n)) : null);
          }}
          className={INPUT_CLASS}
        />
      </FieldGroup>

      <FieldGroup label={t('field.englishLevel')}>
        <Row gap={1} wrap>
          {CEFR_LEVELS.map((level) => (
            <LevelChip
              key={level}
              label={level}
              selected={draft.englishLevel === level}
              onClick={() =>
                patch('englishLevel', draft.englishLevel === level ? null : (level as CefrLevel))
              }
            />
          ))}
        </Row>
      </FieldGroup>
    </Section>
  );
}

function LevelChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick(): void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`min-h-[2.75rem] min-w-[3rem] rounded-full border px-3 text-sm transition ${
        selected
          ? 'border-[var(--color-link,#2481CC)] bg-[var(--color-link,#2481CC)] text-white'
          : 'border-[color:var(--color-hint,#999)]/40 bg-transparent text-[var(--color-text)]'
      }`}
    >
      {label}
    </button>
  );
}
