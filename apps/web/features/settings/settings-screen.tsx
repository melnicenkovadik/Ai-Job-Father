'use client';

import {
  THEME_PREF_EVENT,
  THEME_PREF_STORAGE_KEY,
  type ThemePref,
} from '@/components/telegram/theme-bridge';
import { BottomTabBar, FieldRow, LanguageTile, SectionTitle, Toggle } from '@/components/ui';
import { Screen, Scroll, Section, Stack } from '@/components/ui/layout';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useEffect, useState } from 'react';
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

        <Section title={<SectionTitle>{t('section.notifications')}</SectionTitle>}>
          <Stack gap={2}>
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4">
              <Toggle
                checked={notifications.push}
                onChange={(next) => {
                  if (disabled) return;
                  update.mutate({ notifications: { push: next } });
                }}
                label={t('notification.push.label')}
                description={t('notification.push.description')}
              />
            </div>
            {/* Email + weekly digest stay disabled — backend not wired yet. */}
            <div
              aria-disabled="true"
              className="pointer-events-none rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 opacity-50"
            >
              <div className="flex items-center justify-between border-b border-[var(--color-border)] py-3">
                <span className="text-[12px] font-medium uppercase tracking-wide text-[var(--color-text-mute)]">
                  {t('comingSoon')}
                </span>
              </div>
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
          </Stack>
        </Section>

        <Section title={<SectionTitle>{t('section.theme')}</SectionTitle>}>
          <ThemePicker />
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

function ThemePicker(): React.ReactElement {
  const t = useTranslations('screens.settings.theme');
  const [pref, setPref] = useState<ThemePref>('auto');

  useEffect(() => {
    try {
      const v = localStorage.getItem(THEME_PREF_STORAGE_KEY);
      if (v === 'light' || v === 'dark') setPref(v);
    } catch {
      // Storage unavailable; keep 'auto'.
    }
  }, []);

  const choose = (next: ThemePref): void => {
    setPref(next);
    try {
      if (next === 'auto') localStorage.removeItem(THEME_PREF_STORAGE_KEY);
      else localStorage.setItem(THEME_PREF_STORAGE_KEY, next);
    } catch {
      // ignore
    }
    window.dispatchEvent(new CustomEvent(THEME_PREF_EVENT));
  };

  const options: { value: ThemePref; label: string }[] = [
    { value: 'auto', label: t('auto') },
    { value: 'light', label: t('light') },
    { value: 'dark', label: t('dark') },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => choose(o.value)}
          aria-pressed={pref === o.value}
          className={`min-h-[2.75rem] rounded-[var(--radius-md)] border px-3 py-2 text-[13px] font-medium transition-colors ${
            pref === o.value
              ? 'border-[var(--color-accent)] bg-[var(--color-accent-bg)] text-[var(--color-accent)]'
              : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-hi)]'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
