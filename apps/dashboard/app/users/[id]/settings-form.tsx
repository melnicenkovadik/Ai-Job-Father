'use client';

import { updateUserSettings } from '@/lib/actions/settings';
import type { UserSettingsRow } from '@/lib/queries';
import { useState } from 'react';

type Props = { settings: UserSettingsRow; userId: string };

const LOCALES = ['en', 'uk', 'ru', 'it', 'pl'] as const;

export function SettingsForm({ settings, userId }: Props) {
  const [locale, setLocale] = useState(settings.locale);
  const [notifyPush, setNotifyPush] = useState(settings.notify_push);
  const [notifyEmail, setNotifyEmail] = useState(settings.notify_email);
  const [notifyWeekly, setNotifyWeekly] = useState(settings.notify_weekly);
  const [hasOnboarded, setHasOnboarded] = useState(settings.has_onboarded);
  const [status, setStatus] = useState<'idle' | 'saving' | 'ok' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleSave() {
    setStatus('saving');
    const result = await updateUserSettings(userId, {
      locale: locale as (typeof LOCALES)[number],
      notify_push: notifyPush,
      notify_email: notifyEmail,
      notify_weekly: notifyWeekly,
      has_onboarded: hasOnboarded,
    });
    if (result.ok) {
      setStatus('ok');
      setTimeout(() => setStatus('idle'), 2000);
    } else {
      setError(result.error ?? 'Unknown error');
      setStatus('error');
    }
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 space-y-4">
      <div className="flex items-center gap-4">
        <label htmlFor="settings-locale" className="w-32 text-sm text-zinc-400">
          Locale
        </label>
        <select
          id="settings-locale"
          value={locale}
          onChange={(e) => setLocale(e.target.value)}
          className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-100 focus:outline-none"
        >
          {LOCALES.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>

      {(
        [
          ['Push notifications', notifyPush, setNotifyPush],
          ['Email notifications', notifyEmail, setNotifyEmail],
          ['Weekly digest', notifyWeekly, setNotifyWeekly],
          ['Has onboarded', hasOnboarded, setHasOnboarded],
        ] as [string, boolean, (v: boolean) => void][]
      ).map(([label, value, setter]) => {
        const inputId = `settings-${label.toLowerCase().replace(/\s+/g, '-')}`;
        return (
          <div key={label} className="flex items-center gap-4">
            <label htmlFor={inputId} className="w-32 text-sm text-zinc-400">
              {label}
            </label>
            <input
              id={inputId}
              type="checkbox"
              checked={value}
              onChange={(e) => setter(e.target.checked)}
              className="h-4 w-4 rounded accent-amber-400"
            />
          </div>
        );
      })}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={status === 'saving'}
          className="rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700 disabled:opacity-40"
        >
          {status === 'saving' ? 'Saving…' : 'Save'}
        </button>
        {status === 'ok' && <span className="text-xs text-green-400">Saved</span>}
        {status === 'error' && <span className="text-xs text-red-400">{error}</span>}
      </div>
    </div>
  );
}
