'use client';

import { FieldGroup, Section } from '@/components/ui/layout';
import {
  validateEmail,
  validateGithubUrl,
  validateLinkedinUrl,
  validatePhone,
  validateUrl,
} from '@/lib/forms/validators';
import { useTranslations } from 'next-intl';
import { useId } from 'react';
import type { ProfileDraft } from './types';

interface LinksSectionProps {
  draft: ProfileDraft;
  patch<K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]): void;
}

const INPUT_BASE =
  'min-h-[2.75rem] w-full min-w-0 rounded-md bg-[var(--color-bg)] px-3 text-sm text-[var(--color-text)] outline-none border';
const INPUT_OK = `${INPUT_BASE} border-[color:var(--color-hint,#999)]/30 focus:border-[var(--color-link,#2481CC)]`;
const INPUT_ERR = `${INPUT_BASE} border-red-500 focus:border-red-600`;

export function LinksSection({ draft, patch }: LinksSectionProps) {
  const t = useTranslations('profile');
  const tValidation = useTranslations('profile.validation');
  const optionalTag = t('field.optional');
  const emailId = useId();
  const phoneId = useId();
  const liId = useId();
  const ghId = useId();
  const portfolioId = useId();

  const emailErr = errorText(validateEmail(draft.email), tValidation);
  const phoneErr = errorText(validatePhone(draft.phone), tValidation);
  const liErr = errorText(validateLinkedinUrl(draft.linkedinUrl), tValidation);
  const ghErr = errorText(validateGithubUrl(draft.githubUrl), tValidation);
  const portfolioErr = errorText(validateUrl(draft.portfolioUrl), tValidation);

  return (
    <Section title={`🔗 ${t('section.links')}`}>
      <FieldGroup id={emailId} label={`${t('field.email')} (${optionalTag})`} error={emailErr}>
        <input
          id={emailId}
          type="email"
          autoComplete="email"
          inputMode="email"
          value={draft.email}
          onChange={(e) => patch('email', e.currentTarget.value)}
          maxLength={200}
          className={emailErr ? INPUT_ERR : INPUT_OK}
          aria-invalid={emailErr !== undefined}
        />
      </FieldGroup>

      <FieldGroup id={phoneId} label={`${t('field.phone')} (${optionalTag})`} error={phoneErr}>
        <input
          id={phoneId}
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          value={draft.phone}
          onChange={(e) => patch('phone', e.currentTarget.value)}
          maxLength={60}
          className={phoneErr ? INPUT_ERR : INPUT_OK}
          aria-invalid={phoneErr !== undefined}
        />
      </FieldGroup>

      <FieldGroup id={liId} label={`${t('field.linkedin')} (${optionalTag})`} error={liErr}>
        <input
          id={liId}
          type="url"
          inputMode="url"
          placeholder="https://linkedin.com/in/..."
          value={draft.linkedinUrl}
          onChange={(e) => patch('linkedinUrl', e.currentTarget.value)}
          maxLength={500}
          className={liErr ? INPUT_ERR : INPUT_OK}
          aria-invalid={liErr !== undefined}
        />
      </FieldGroup>

      <FieldGroup id={ghId} label={`${t('field.github')} (${optionalTag})`} error={ghErr}>
        <input
          id={ghId}
          type="url"
          inputMode="url"
          placeholder="https://github.com/..."
          value={draft.githubUrl}
          onChange={(e) => patch('githubUrl', e.currentTarget.value)}
          maxLength={500}
          className={ghErr ? INPUT_ERR : INPUT_OK}
          aria-invalid={ghErr !== undefined}
        />
      </FieldGroup>

      <FieldGroup
        id={portfolioId}
        label={`${t('field.portfolio')} (${optionalTag})`}
        error={portfolioErr}
      >
        <input
          id={portfolioId}
          type="url"
          inputMode="url"
          placeholder="https://..."
          value={draft.portfolioUrl}
          onChange={(e) => patch('portfolioUrl', e.currentTarget.value)}
          maxLength={500}
          className={portfolioErr ? INPUT_ERR : INPUT_OK}
          aria-invalid={portfolioErr !== undefined}
        />
      </FieldGroup>
    </Section>
  );
}

function errorText(
  code: string | undefined,
  t: ReturnType<typeof useTranslations<'profile.validation'>>,
): string | undefined {
  if (!code) return undefined;
  return t(code);
}
