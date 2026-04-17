'use client';

import { FieldGroup, Section } from '@/components/ui/layout';
import { useTranslations } from 'next-intl';
import { useId } from 'react';
import type { ProfileDraft } from './types';

interface LinksSectionProps {
  draft: ProfileDraft;
  patch<K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]): void;
}

const INPUT_CLASS =
  'min-h-[2.75rem] w-full min-w-0 rounded-md border border-[color:var(--color-hint,#999)]/30 bg-[var(--color-bg)] px-3 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-link,#2481CC)]';

export function LinksSection({ draft, patch }: LinksSectionProps) {
  const t = useTranslations('profile');
  const optionalTag = t('field.optional');
  const emailId = useId();
  const phoneId = useId();
  const liId = useId();
  const ghId = useId();
  const portfolioId = useId();

  return (
    <Section title={`🔗 ${t('section.links')}`}>
      <FieldGroup id={emailId} label={`${t('field.email')} (${optionalTag})`}>
        <input
          id={emailId}
          type="email"
          autoComplete="email"
          inputMode="email"
          value={draft.email}
          onChange={(e) => patch('email', e.currentTarget.value)}
          maxLength={200}
          className={INPUT_CLASS}
        />
      </FieldGroup>

      <FieldGroup id={phoneId} label={`${t('field.phone')} (${optionalTag})`}>
        <input
          id={phoneId}
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          value={draft.phone}
          onChange={(e) => patch('phone', e.currentTarget.value)}
          maxLength={60}
          className={INPUT_CLASS}
        />
      </FieldGroup>

      <FieldGroup id={liId} label={`${t('field.linkedin')} (${optionalTag})`}>
        <input
          id={liId}
          type="url"
          inputMode="url"
          placeholder="https://linkedin.com/in/..."
          value={draft.linkedinUrl}
          onChange={(e) => patch('linkedinUrl', e.currentTarget.value)}
          maxLength={500}
          className={INPUT_CLASS}
        />
      </FieldGroup>

      <FieldGroup id={ghId} label={`${t('field.github')} (${optionalTag})`}>
        <input
          id={ghId}
          type="url"
          inputMode="url"
          placeholder="https://github.com/..."
          value={draft.githubUrl}
          onChange={(e) => patch('githubUrl', e.currentTarget.value)}
          maxLength={500}
          className={INPUT_CLASS}
        />
      </FieldGroup>

      <FieldGroup id={portfolioId} label={`${t('field.portfolio')} (${optionalTag})`}>
        <input
          id={portfolioId}
          type="url"
          inputMode="url"
          placeholder="https://..."
          value={draft.portfolioUrl}
          onChange={(e) => patch('portfolioUrl', e.currentTarget.value)}
          maxLength={500}
          className={INPUT_CLASS}
        />
      </FieldGroup>
    </Section>
  );
}
