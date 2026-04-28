'use server';

import { revalidatePath } from 'next/cache';
import { auditLog } from '../audit';
import { getServiceClient } from '../supabase';
import type { ActionResult } from './campaigns';

export type SettingsPatch = {
  locale?: 'en' | 'uk' | 'ru' | 'it' | 'pl';
  notify_push?: boolean;
  notify_email?: boolean;
  notify_weekly?: boolean;
  has_onboarded?: boolean;
};

export async function updateUserSettings(
  userId: string,
  patch: SettingsPatch,
): Promise<ActionResult> {
  try {
    const supabase = getServiceClient();
    const { error } = await supabase
      .from('user_settings')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (error) return { ok: false, error: error.message };

    await auditLog('settings.update', { userId, patch, by: 'dashboard' });
    revalidatePath(`/users/${userId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
