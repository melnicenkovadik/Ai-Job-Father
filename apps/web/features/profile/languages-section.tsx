'use client';

import { Row, Section, Stack } from '@/components/ui/layout';
import { CEFR_LEVELS, type CefrLevel } from '@ai-job-bot/core';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { type LanguageDraft, type ProfileDraft, draftId } from './types';

interface LanguagesSectionProps {
  draft: ProfileDraft;
  patch<K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]): void;
}

const INPUT_CLASS =
  'min-h-[2.75rem] w-full min-w-0 rounded-md border border-[color:var(--color-hint,#999)]/30 bg-[var(--color-bg)] px-3 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-link,#2481CC)]';

const ADD_BUTTON_CLASS =
  'min-h-[2.75rem] min-w-[2.75rem] rounded-md bg-[var(--color-button,#2481CC)] px-4 text-sm font-medium text-[var(--color-button-text,#ffffff)]';

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  uk: 'Українська',
  ru: 'Русский',
  it: 'Italiano',
  pl: 'Polski',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  pt: 'Português',
  nl: 'Nederlands',
  tr: 'Türkçe',
  ja: '日本語',
  zh: '中文',
  ar: 'العربية',
  hi: 'हिन्दी',
};

export function LanguagesSection({ draft, patch }: LanguagesSectionProps) {
  const t = useTranslations('profile');
  const [addValue, setAddValue] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const inputId = useId();

  function addLanguage() {
    const code = normalizeLangInput(addValue);
    if (!code) return;
    if (draft.languages.some((l) => l.code === code)) {
      setAddValue('');
      return;
    }
    patch('languages', [...draft.languages, { id: draftId('l'), code, level: 'B1' as CefrLevel }]);
    setAddValue('');
  }

  function updateLanguage(id: string, next: Partial<LanguageDraft>) {
    patch(
      'languages',
      draft.languages.map((l) => (l.id === id ? { ...l, ...next } : l)),
    );
  }

  function removeLanguage(id: string) {
    patch(
      'languages',
      draft.languages.filter((l) => l.id !== id),
    );
    setExpandedId(null);
  }

  return (
    <Section title={`🌐 ${t('section.languages')}`}>
      <Row gap={2} align="center">
        <input
          id={inputId}
          type="text"
          placeholder={`${t('actions.addLanguage')} (en, uk, italiano…)`}
          value={addValue}
          onChange={(e) => setAddValue(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addLanguage();
            }
          }}
          maxLength={40}
          className={INPUT_CLASS}
        />
        <button type="button" onClick={addLanguage} className={ADD_BUTTON_CLASS}>
          +
        </button>
      </Row>

      {draft.languages.length === 0 ? (
        <p className="text-xs opacity-60 [overflow-wrap:anywhere]">{t('empty.noLanguages')}</p>
      ) : (
        <div className="flex min-w-0 flex-wrap gap-2">
          {draft.languages.map((lang) =>
            expandedId === lang.id ? (
              <LanguageEditor
                key={lang.id}
                lang={lang}
                onChange={(next) => updateLanguage(lang.id, next)}
                onRemove={() => removeLanguage(lang.id)}
                onClose={() => setExpandedId(null)}
              />
            ) : (
              <LanguageChip key={lang.id} lang={lang} onClick={() => setExpandedId(lang.id)} />
            ),
          )}
        </div>
      )}
    </Section>
  );
}

function LanguageChip({ lang, onClick }: { lang: LanguageDraft; onClick(): void }) {
  const name = LANGUAGE_NAMES[lang.code] ?? lang.code.toUpperCase();
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-[2.25rem] rounded-full border border-[color:var(--color-hint,#999)]/40 bg-[color:var(--color-button,#2481CC)]/10 px-3 text-sm text-[var(--color-text)]"
    >
      {name} · {lang.level}
    </button>
  );
}

function LanguageEditor({
  lang,
  onChange,
  onRemove,
  onClose,
}: {
  lang: LanguageDraft;
  onChange(next: Partial<LanguageDraft>): void;
  onRemove(): void;
  onClose(): void;
}) {
  const t = useTranslations('profile');
  const codeId = useId();
  return (
    <Stack
      gap={2}
      className="w-full rounded-lg border-2 border-[var(--color-link,#2481CC)] bg-[var(--color-bg)] p-3"
    >
      <label htmlFor={codeId} className="text-xs opacity-70">
        {t('field.language')}
      </label>
      <select
        id={codeId}
        value={lang.code}
        onChange={(e) => onChange({ code: e.currentTarget.value })}
        className={INPUT_CLASS}
      >
        {Object.entries(LANGUAGE_NAMES).map(([code, name]) => (
          <option key={code} value={code}>
            {name} ({code})
          </option>
        ))}
      </select>
      <span className="text-xs opacity-70">{t('field.level')}</span>
      <Row gap={1} wrap>
        {CEFR_LEVELS.map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => onChange({ level: level as CefrLevel })}
            aria-pressed={lang.level === level}
            className={`min-h-[2.75rem] min-w-[3rem] rounded-full border px-3 text-sm ${
              lang.level === level
                ? 'border-[var(--color-link,#2481CC)] bg-[var(--color-link,#2481CC)] text-white'
                : 'border-[color:var(--color-hint,#999)]/40'
            }`}
          >
            {level}
          </button>
        ))}
      </Row>
      <Row gap={2}>
        <button
          type="button"
          onClick={onClose}
          className="min-h-[2.75rem] flex-1 rounded-md bg-[var(--color-button,#2481CC)] px-3 text-sm font-medium text-[var(--color-button-text,#ffffff)]"
        >
          {t('actions.saved')}
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="min-h-[2.75rem] rounded-md border border-red-500/50 px-3 text-sm text-red-600 dark:text-red-400"
        >
          🗑
        </button>
      </Row>
    </Stack>
  );
}

function normalizeLangInput(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  if (trimmed.length === 0) return null;
  if (trimmed.length === 2 && /^[a-z]{2}$/.test(trimmed)) return trimmed;
  // Name → code lookup
  for (const [code, name] of Object.entries(LANGUAGE_NAMES)) {
    if (name.toLowerCase() === trimmed || name.toLowerCase().startsWith(trimmed)) return code;
  }
  return null;
}
