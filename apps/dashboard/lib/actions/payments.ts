'use server';

import { revalidatePath } from 'next/cache';
import { auditLog } from '../audit';
import { getServiceClient } from '../supabase';
import type { ActionResult } from './campaigns';

export async function markRefunded(id: string, reason: string): Promise<ActionResult> {
  try {
    const supabase = getServiceClient();
    const { error } = await supabase
      .from('payments')
      .update({ status: 'refunded' })
      .eq('id', id)
      .eq('status', 'succeeded');

    if (error) return { ok: false, error: error.message };

    await auditLog('payments.refund', { id, reason, by: 'dashboard' });
    revalidatePath(`/payments/${id}`);
    revalidatePath('/payments');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
