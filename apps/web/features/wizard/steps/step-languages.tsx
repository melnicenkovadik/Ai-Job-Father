'use client';

import { LanguageTile } from '@/components/ui';
import { Stack } from '@/components/ui/layout';
import { useWizardDraft } from '@/features/wizard/draft-store';
import { useTranslations } from 'next-intl';

const LANGS = ['EN', 'DE', 'FR', 'ES', 'PL'] as const;
type LangCode = (typeof LANGS)[number];

export function StepLanguages() {
  const t = useTranslations('screens.wizard.langs');
  const { languages, patchDraft } = useWizardDraft((s) => ({
    languages: s.draft.languages,
    patchDraft: s.patchDraft,
  }));

  const toggle = (code: LangCode) => {
    if (languages.includes(code)) {
      patchDraft({ languages: languages.filter((x) => x !== code) });
    } else {
      patchDraft({ languages: [...languages, code] });
    }
  };

  return (
    <Stack gap={2}>
      {LANGS.map((code) => (
        <LanguageTile
          key={code}
          code={code}
          label={t(code)}
          selected={languages.includes(code)}
          onSelect={() => toggle(code)}
        />
      ))}
    </Stack>
  );
}
