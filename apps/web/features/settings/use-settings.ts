'use client';

import { authedFetch } from '@/lib/http/authed-fetch';
import { getBrowserLogger } from '@/lib/logger';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface SettingsDto {
  locale: 'en' | 'uk' | 'ru' | 'it' | 'pl';
  notifications: { push: boolean; email: boolean; weekly: boolean };
  hasOnboarded: boolean;
  updatedAt: string;
}

const SETTINGS_KEY = ['settings'] as const;

async function fetchSettings(): Promise<SettingsDto> {
  const res = await authedFetch('/api/settings');
  if (!res.ok) throw new Error(`settings_fetch_failed_${res.status}`);
  return (await res.json()) as SettingsDto;
}

export interface SettingsPatch {
  locale?: SettingsDto['locale'];
  notifications?: Partial<SettingsDto['notifications']>;
}

async function patchSettings(patch: SettingsPatch): Promise<SettingsDto> {
  const res = await authedFetch('/api/settings', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `settings_patch_failed_${res.status}`);
  }
  return (await res.json()) as SettingsDto;
}

export function useSettingsQuery() {
  return useQuery<SettingsDto, Error>({
    queryKey: SETTINGS_KEY,
    queryFn: fetchSettings,
    staleTime: 30_000,
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation<SettingsDto, Error, SettingsPatch>({
    mutationFn: patchSettings,
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: SETTINGS_KEY });
      const previous = qc.getQueryData<SettingsDto>(SETTINGS_KEY);
      if (previous) {
        qc.setQueryData<SettingsDto>(SETTINGS_KEY, {
          ...previous,
          locale: patch.locale ?? previous.locale,
          notifications: { ...previous.notifications, ...patch.notifications },
        });
      }
      return { previous };
    },
    onError: (err, _patch, ctx) => {
      const previous = (ctx as { previous?: SettingsDto } | undefined)?.previous;
      if (previous) qc.setQueryData(SETTINGS_KEY, previous);
      getBrowserLogger().error({
        context: 'features/settings.update',
        message: err.message,
        error: err,
      });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: SETTINGS_KEY });
    },
  });
}
