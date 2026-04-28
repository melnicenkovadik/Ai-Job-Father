'use server';

import { revalidatePath } from 'next/cache';
import { auditLog } from '../audit';
import { getServiceClient } from '../supabase';

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function cancelCampaign(id: string): Promise<ActionResult> {
  try {
    const supabase = getServiceClient();
    const { error } = await supabase
      .from('campaigns')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', id)
      .in('status', ['draft', 'paid', 'searching', 'applying']);

    if (error) return { ok: false, error: error.message };

    await auditLog('campaigns.cancel', { id, by: 'dashboard' });
    revalidatePath(`/campaigns/${id}`);
    revalidatePath('/campaigns');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export async function forceTick(id: string): Promise<ActionResult> {
  try {
    const supabase = getServiceClient();

    const [campaignUpdate, simUpdate] = await Promise.all([
      supabase.from('campaigns').update({ last_ticked_at: null }).eq('id', id),
      supabase
        .from('campaign_simulator_state')
        .update({ locked_until: null })
        .eq('campaign_id', id),
    ]);

    if (campaignUpdate.error) return { ok: false, error: campaignUpdate.error.message };
    if (simUpdate.error && simUpdate.error.code !== 'PGRST116') {
      // PGRST116 = no rows matched (no simulator state yet, that's fine)
      return { ok: false, error: simUpdate.error.message };
    }

    await auditLog('campaigns.force_tick', { id, by: 'dashboard' });
    revalidatePath(`/campaigns/${id}`);
    revalidatePath('/simulator');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export async function resetSimulator(id: string): Promise<ActionResult> {
  try {
    const supabase = getServiceClient();
    const { error } = await supabase
      .from('campaign_simulator_state')
      .delete()
      .eq('campaign_id', id);

    if (error) return { ok: false, error: error.message };

    await auditLog('campaigns.reset_simulator', { id, by: 'dashboard' });
    revalidatePath(`/campaigns/${id}`);
    revalidatePath('/simulator');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
