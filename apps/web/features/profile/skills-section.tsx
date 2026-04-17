'use client';

import { Row, Section, Stack } from '@/components/ui/layout';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { type ProfileDraft, type SkillDraft, draftId } from './types';

interface SkillsSectionProps {
  draft: ProfileDraft;
  patch<K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]): void;
}

const INPUT_CLASS =
  'min-h-[2.75rem] w-full min-w-0 rounded-md border border-[color:var(--color-hint,#999)]/30 bg-[var(--color-bg)] px-3 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-link,#2481CC)]';

const ADD_BUTTON_CLASS =
  'min-h-[2.75rem] min-w-[2.75rem] rounded-md bg-[var(--color-button,#2481CC)] px-4 text-sm font-medium text-[var(--color-button-text,#ffffff)]';

export function SkillsSection({ draft, patch }: SkillsSectionProps) {
  const t = useTranslations('profile');
  const [addValue, setAddValue] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const inputId = useId();

  function addSkill() {
    const name = addValue.trim();
    if (name.length === 0 || name.length > 40) return;
    if (draft.skills.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      setAddValue('');
      return;
    }
    patch('skills', [...draft.skills, { id: draftId('s'), name, years: null }]);
    setAddValue('');
  }

  function updateSkill(id: string, next: Partial<SkillDraft>) {
    patch(
      'skills',
      draft.skills.map((s) => (s.id === id ? { ...s, ...next } : s)),
    );
  }

  function removeSkill(id: string) {
    patch(
      'skills',
      draft.skills.filter((s) => s.id !== id),
    );
    setExpandedId(null);
  }

  return (
    <Section title={`🧠 ${t('section.skills')}`}>
      <Row gap={2} align="center">
        <input
          id={inputId}
          type="text"
          placeholder={t('actions.addSkill')}
          value={addValue}
          onChange={(e) => setAddValue(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addSkill();
            }
          }}
          maxLength={40}
          className={INPUT_CLASS}
        />
        <button type="button" onClick={addSkill} className={ADD_BUTTON_CLASS}>
          +
        </button>
      </Row>

      {draft.skills.length === 0 ? (
        <p className="text-xs opacity-60 [overflow-wrap:anywhere]">{t('empty.noSkills')}</p>
      ) : (
        <div className="flex min-w-0 flex-wrap gap-2">
          {draft.skills.map((skill) =>
            expandedId === skill.id ? (
              <SkillEditor
                key={skill.id}
                skill={skill}
                onChange={(next) => updateSkill(skill.id, next)}
                onRemove={() => removeSkill(skill.id)}
                onClose={() => setExpandedId(null)}
              />
            ) : (
              <SkillChip key={skill.id} skill={skill} onClick={() => setExpandedId(skill.id)} />
            ),
          )}
        </div>
      )}
    </Section>
  );
}

function SkillChip({ skill, onClick }: { skill: SkillDraft; onClick(): void }) {
  const label = skill.years !== null ? `${skill.name} · ${skill.years}y` : skill.name;
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-[2.25rem] rounded-full border border-[color:var(--color-hint,#999)]/40 bg-[color:var(--color-button,#2481CC)]/10 px-3 text-sm text-[var(--color-text)] [overflow-wrap:anywhere]"
    >
      {label}
    </button>
  );
}

function SkillEditor({
  skill,
  onChange,
  onRemove,
  onClose,
}: {
  skill: SkillDraft;
  onChange(next: Partial<SkillDraft>): void;
  onRemove(): void;
  onClose(): void;
}) {
  const t = useTranslations('profile');
  const nameId = useId();
  const yearsId = useId();
  return (
    <Stack
      gap={2}
      className="w-full rounded-lg border-2 border-[var(--color-link,#2481CC)] bg-[var(--color-bg)] p-3"
    >
      <label htmlFor={nameId} className="text-xs opacity-70 [overflow-wrap:anywhere]">
        {t('field.skillName')}
      </label>
      <input
        id={nameId}
        type="text"
        value={skill.name}
        onChange={(e) => onChange({ name: e.currentTarget.value.slice(0, 40) })}
        maxLength={40}
        className={INPUT_CLASS}
      />
      <label htmlFor={yearsId} className="text-xs opacity-70 [overflow-wrap:anywhere]">
        {t('field.years')}: {skill.years ?? '—'}
      </label>
      <input
        id={yearsId}
        type="range"
        min={0}
        max={30}
        step={1}
        value={skill.years ?? 0}
        onChange={(e) => onChange({ years: Number.parseInt(e.currentTarget.value, 10) })}
        className="w-full"
      />
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
