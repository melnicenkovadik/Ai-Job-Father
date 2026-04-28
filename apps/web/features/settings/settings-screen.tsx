'use client';

import { BottomTabBar, FieldRow, LanguageTile, SectionTitle, Toggle } from '@/components/ui';
import { Screen, Scroll, Section, Stack } from '@/components/ui/layout';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { type SettingsDto, useSettingsQuery, useUpdateSettings } from './use-settings';

const LOCALES: { code: SettingsDto['locale']; label: string; native: string }[] = [
  { code: 'ru', label: 'RU', native: 'Русский' },
  { code: 'uk', label: 'UA', native: 'Українська' },
  { code: 'en', label: 'EN', native: 'English' },
  { code: 'pl', label: 'PL', native: 'Polski' },
  { code: 'it', label: 'IT', native: 'Italiano' },
];

const PLACEHOLDER_NOTIFICATIONS = { push: false, email: false, weekly: false };

export function SettingsScreen() {
  const t = useTranslations('screens.settings');
  const router = useRouter();
  const { data, isLoading } = useSettingsQuery();
  const update = useUpdateSettings();

  const locale = data?.locale ?? 'en';
  const notifications = data?.notifications ?? PLACEHOLDER_NOTIFICATIONS;
  const disabled = isLoading || update.isPending;

  return (
    <Screen reserveMainButton={false} className="pb-[5.5rem]">
      <Scroll className="flex-1">
        <Stack gap={0} className="px-4 pb-2 pt-6">
          <h1 className="text-[28px] font-bold tracking-tight text-[var(--color-text)]">
            {t('title')}
          </h1>
        </Stack>

        <Section title={<SectionTitle>{t('section.language')}</SectionTitle>}>
          <Stack gap={2}>
            {LOCALES.map((l) => (
              <LanguageTile
                key={l.code}
                code={l.label}
                label={l.native}
                selected={locale === l.code}
                onSelect={() => {
                  if (disabled || locale === l.code) return;
                  update.mutate(
                    { locale: l.code },
                    {
                      // The server has set the `locale` cookie in the response.
                      // router.refresh() forces RSC to re-render with the new
                      // cookie so next-intl picks the new dictionary.
                      onSuccess: () => router.refresh(),
                    },
                  );
                }}
              />
            ))}
          </Stack>
        </Section>

        <Section
          title={
            <SectionTitle>
              <span className="inline-flex items-center gap-2">
                {t('section.notifications')}
                <span className="rounded-full bg-[var(--color-bg-2)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-mute)]">
                  {t('comingSoon')}
                </span>
              </span>
            </SectionTitle>
          }
        >
          <div
            aria-disabled="true"
            className="pointer-events-none rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 opacity-50"
          >
            <Toggle
              checked={notifications.push}
              onChange={() => {}}
              label={t('notification.push.label')}
              description={t('notification.push.description')}
            />
            <Toggle
              checked={notifications.email}
              onChange={() => {}}
              label={t('notification.email.label')}
              description={t('notification.email.description')}
            />
            <Toggle
              checked={notifications.weekly}
              onChange={() => {}}
              label={t('notification.weeklyDigest.label')}
              description={t('notification.weeklyDigest.description')}
            />
          </div>
        </Section>

        <Section title={<SectionTitle>{t('section.about')}</SectionTitle>}>
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4">
            <FieldRow label={t('about.version')} value="0.1.0" mono />
            <FieldRow label={t('about.support')} value="@aijobbot_support" />
          </div>
        </Section>
      </Scroll>
      <BottomTabBar />
    </Screen>
  );
}
