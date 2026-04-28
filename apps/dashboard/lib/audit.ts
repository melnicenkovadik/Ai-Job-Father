import 'server-only';
import { getServiceClient } from './supabase';

export type AuditAction =
  | 'campaigns.cancel'
  | 'campaigns.force_tick'
  | 'campaigns.reset_simulator'
  | 'payments.refund'
  | 'profiles.delete'
  | 'settings.update'
  | 'broadcast.send';

export async function auditLog(action: AuditAction, data: Record<string, unknown>): Promise<void> {
  const supabase = getServiceClient();
  await supabase.from('app_logs').insert({
    level: 'info',
    source: 'web',
    context: `admin/${action}`,
    message: `dashboard ${action}`,
    data,
  });
}
