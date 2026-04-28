import { getServiceClient } from '@/lib/supabase';
import { BroadcastForm } from './broadcast-form';

export const dynamic = 'force-dynamic';

export default async function OperationsPage() {
  const supabase = getServiceClient();
  const { data } = await supabase.from('users').select('id');
  const allUserIds = ((data ?? []) as { id: string }[]).map((u) => u.id);

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-bold">Operations</h1>
      </header>

      {/* Broadcast */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Broadcast message</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Send a Telegram message to one or more users. Rate-limited to 1 message/sec.
          </p>
        </div>
        <div className="max-w-lg rounded-lg border border-zinc-800 bg-zinc-900/60 p-5">
          <BroadcastForm allUserIds={allUserIds} />
        </div>
      </section>

      {/* Crawler switch — placeholder */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Job crawler</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Switch between the simulator and the real downstream crawler service.
          </p>
        </div>
        <div className="max-w-lg rounded-lg border border-dashed border-zinc-700 bg-zinc-900/40 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-300">Real crawler</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                Activate once the downstream crawler service is deployed.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-600">Coming soon</span>
              <button
                type="button"
                disabled
                className="h-6 w-11 cursor-not-allowed rounded-full border border-zinc-700 bg-zinc-800 opacity-40"
                title="Not yet available"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
