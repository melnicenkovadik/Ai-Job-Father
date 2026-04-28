'use server';

import { revalidatePath } from 'next/cache';
import { auditLog } from '../audit';
import { getServiceClient } from '../supabase';
import type { ActionResult } from './campaigns';

export async function deleteProfile(id: string, userId: string): Promise<ActionResult> {
  try {
    const supabase = getServiceClient();
    const { error } = await supabase.from('profiles').delete().eq('id', id);

    if (error) {
      // FK RESTRICT violation: profile referenced by a paid campaign
      if (error.code === '23503') {
        return {
          ok: false,
          error: 'Profile is referenced by a paid campaign and cannot be deleted.',
        };
      }
      return { ok: false, error: error.message };
    }

    await auditLog('profiles.delete', { id, userId, by: 'dashboard' });
    revalidatePath(`/users/${userId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
